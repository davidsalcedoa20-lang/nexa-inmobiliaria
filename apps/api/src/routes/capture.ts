import {
  CreateCapturePhotoUploadSchema,
  CreateCaptureRoomSchema,
  type CapturePhoto,
  type CaptureRoom,
  type CaptureSession,
} from "@nexa/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authorizeRoles, type AuthDependencies } from "../auth/authorize.js";
import {
  CapturePhotoNotFoundError,
  CapturePhotoLimitError,
  type CaptureRepository,
  CaptureRoomNotFoundError,
  CaptureUploadMismatchError,
  CaptureUploadMissingError,
  type StoredCapturePhoto,
  type StoredCaptureRoom,
  type StoredCaptureSession,
} from "../capture/types.js";
import type { PropertyRepository } from "../properties/types.js";
import type { ObjectStorageProvider } from "../storage/types.js";

const PropertyParamsSchema = z.object({ propertyId: z.uuid() });
const RoomParamsSchema = PropertyParamsSchema.extend({ roomId: z.uuid() });
const PhotoParamsSchema = PropertyParamsSchema.extend({ photoId: z.uuid() });
const UPLOAD_URL_SECONDS = 15 * 60;
const PREVIEW_URL_SECONDS = 15 * 60;

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export type CaptureRouteDependencies = AuthDependencies & {
  properties: PropertyRepository;
  captures: CaptureRepository;
  objectStorage: ObjectStorageProvider;
};

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    code: "VALIDATION_ERROR",
    message: "Revisa los datos enviados",
    issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  });
}

function captureError(reply: FastifyReply, error: unknown) {
  if (error instanceof CapturePhotoLimitError) {
    return reply.code(409).send({ code: "CAPTURE_PHOTO_LIMIT", message: "La habitación alcanzó el límite de 250 fotos. Elimina las incorrectas o pendientes antes de continuar." });
  }
  if (error instanceof CaptureRoomNotFoundError) {
    return reply.code(404).send({ code: "CAPTURE_ROOM_NOT_FOUND", message: "La habitación no existe" });
  }
  if (error instanceof CapturePhotoNotFoundError) {
    return reply.code(404).send({ code: "CAPTURE_PHOTO_NOT_FOUND", message: "La fotografía no existe" });
  }
  if (error instanceof CaptureUploadMissingError) {
    return reply.code(409).send({ code: "CAPTURE_UPLOAD_MISSING", message: "La fotografía todavía no está en el almacenamiento" });
  }
  if (error instanceof CaptureUploadMismatchError) {
    return reply.code(409).send({ code: "CAPTURE_UPLOAD_MISMATCH", message: "El archivo subido no coincide con la fotografía registrada" });
  }
  throw error;
}

async function publicPhoto(
  stored: StoredCapturePhoto,
  objectStorage: ObjectStorageProvider,
): Promise<CapturePhoto> {
  const { objectKey, ...photo } = stored;
  return {
    ...photo,
    previewUrl:
      stored.status === "uploaded"
        ? await objectStorage.createDownloadUrl(objectKey, PREVIEW_URL_SECONDS)
        : null,
  };
}

async function publicRoom(
  stored: StoredCaptureRoom,
  objectStorage: ObjectStorageProvider,
): Promise<CaptureRoom> {
  return {
    ...stored,
    photos: await Promise.all(stored.photos.map((item) => publicPhoto(item, objectStorage))),
  };
}

async function publicSession(
  stored: StoredCaptureSession,
  objectStorage: ObjectStorageProvider,
): Promise<CaptureSession> {
  return {
    ...stored,
    rooms: await Promise.all(stored.rooms.map((item) => publicRoom(item, objectStorage))),
  };
}

async function propertyExists(propertyId: string, dependencies: CaptureRouteDependencies) {
  return Boolean(await dependencies.properties.findById(propertyId));
}

export async function registerCaptureRoutes(
  app: FastifyInstance,
  dependencies: CaptureRouteDependencies,
) {
  app.get("/api/v1/properties/:propertyId/capture", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    if (!(await propertyExists(params.data.propertyId, dependencies))) {
      return reply.code(404).send({ code: "PROPERTY_NOT_FOUND", message: "La propiedad no existe" });
    }
    const snapshot = await dependencies.captures.getSnapshot(params.data.propertyId);
    return { data: snapshot ? await publicSession(snapshot, dependencies.objectStorage) : null };
  });

  app.post("/api/v1/properties/:propertyId/capture/sessions", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    if (!(await propertyExists(params.data.propertyId, dependencies))) {
      return reply.code(404).send({ code: "PROPERTY_NOT_FOUND", message: "La propiedad no existe" });
    }
    const snapshot = await dependencies.captures.getOrCreateActiveSession(
      params.data.propertyId,
      administrator.userId,
    );
    return reply.code(201).send({ data: await publicSession(snapshot, dependencies.objectStorage) });
  });

  app.post("/api/v1/properties/:propertyId/capture/rooms", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    const body = CreateCaptureRoomSchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error);
    if (!(await propertyExists(params.data.propertyId, dependencies))) {
      return reply.code(404).send({ code: "PROPERTY_NOT_FOUND", message: "La propiedad no existe" });
    }
    const created = await dependencies.captures.createRoom(
      params.data.propertyId,
      body.data,
      administrator.userId,
    );
    return reply.code(201).send({ data: await publicRoom(created, dependencies.objectStorage) });
  });

  app.delete("/api/v1/properties/:propertyId/capture/rooms/:roomId", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = RoomParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    try {
      const objectKeys = await dependencies.captures.deleteRoom(params.data.propertyId, params.data.roomId);
      await Promise.all(objectKeys.map((key) => dependencies.objectStorage.deleteObject(key)));
      return reply.code(204).send();
    } catch (error) {
      return captureError(reply, error);
    }
  });

  app.post(
    "/api/v1/properties/:propertyId/capture/rooms/:roomId/photos/upload-url",
    async (request, reply) => {
      const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
      if (!administrator) return;
      const params = RoomParamsSchema.safeParse(request.params);
      if (!params.success) return validationError(reply, params.error);
      const body = CreateCapturePhotoUploadSchema.safeParse(request.body);
      if (!body.success) return validationError(reply, body.error);
      const photoId = randomUUID();
      const objectKey = `properties/${params.data.propertyId}/capture/rooms/${params.data.roomId}/${photoId}.${extensions[body.data.contentType]}`;
      try {
        const stored = await dependencies.captures.createPendingPhoto({
          propertyId: params.data.propertyId,
          roomId: params.data.roomId,
          photoId,
          objectKey,
          metadata: body.data,
          administratorId: administrator.userId,
        });
        const uploadUrl = await dependencies.objectStorage.createUploadUrl({
          objectKey,
          contentType: body.data.contentType,
          expiresInSeconds: UPLOAD_URL_SECONDS,
        });
        return reply.code(201).send({
          data: {
            photo: await publicPhoto(stored, dependencies.objectStorage),
            uploadUrl,
            expiresAt: new Date(Date.now() + UPLOAD_URL_SECONDS * 1000).toISOString(),
          },
        });
      } catch (error) {
        return captureError(reply, error);
      }
    },
  );

  app.post("/api/v1/properties/:propertyId/capture/photos/:photoId/complete", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PhotoParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    try {
      const pending = await dependencies.captures.findPhoto(params.data.propertyId, params.data.photoId);
      if (!pending) throw new CapturePhotoNotFoundError();
      const object = await dependencies.objectStorage.headObject(pending.objectKey);
      if (!object) {
        await dependencies.captures.markPhotoFailed(params.data.propertyId, params.data.photoId);
        throw new CaptureUploadMissingError();
      }
      if (object.contentLength !== pending.byteSize || object.contentType !== pending.contentType) {
        await dependencies.objectStorage.deleteObject(pending.objectKey);
        await dependencies.captures.markPhotoFailed(params.data.propertyId, params.data.photoId);
        throw new CaptureUploadMismatchError();
      }
      const uploaded = await dependencies.captures.markPhotoUploaded(
        params.data.propertyId,
        params.data.photoId,
        { etag: object.etag },
      );
      return { data: await publicPhoto(uploaded, dependencies.objectStorage) };
    } catch (error) {
      return captureError(reply, error);
    }
  });

  app.delete("/api/v1/properties/:propertyId/capture/photos/:photoId", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PhotoParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    try {
      const photo = await dependencies.captures.findPhoto(params.data.propertyId, params.data.photoId);
      if (!photo) throw new CapturePhotoNotFoundError();
      await dependencies.objectStorage.deleteObject(photo.objectKey);
      await dependencies.captures.deletePhoto(params.data.propertyId, params.data.photoId);
      return reply.code(204).send();
    } catch (error) {
      return captureError(reply, error);
    }
  });
}
