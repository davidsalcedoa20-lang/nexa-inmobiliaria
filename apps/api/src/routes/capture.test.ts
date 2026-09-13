import type {
  AdminRole,
  CapturePhoto,
  CreateCapturePhotoUploadData,
  CreateCaptureRoomData,
  Property,
} from "@nexa/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../application.js";
import type { AdminProfileRepository, TokenVerifier } from "../auth/types.js";
import {
  CapturePhotoNotFoundError,
  type CaptureRepository,
  CaptureRoomNotFoundError,
  type StoredCapturePhoto,
  type StoredCaptureRoom,
  type StoredCaptureSession,
} from "../capture/types.js";
import type { PropertyRepository } from "../properties/types.js";
import type { ObjectStorageProvider, StoredObjectMetadata } from "../storage/types.js";

const administratorId = "78d49554-e1e2-4fd0-b9e2-a728bb8fdd2c";
const propertyId = "231f15f9-877c-464f-ae32-e1b8f7446987";
const sessionId = "b25ae061-a2c9-499c-ad91-b208a4c8c58e";
const roomId = "9163ba36-97ac-4c99-b25e-7088050c3437";
const now = "2026-09-12T15:00:00.000Z";

const verifier: TokenVerifier = {
  async verify(token) {
    if (token !== "valid-token") throw new Error("invalid");
    return { userId: administratorId, email: "admin@nexa.test" };
  },
};

function profiles(role: AdminRole): AdminProfileRepository {
  return {
    async findActiveByUserId() {
      return { id: administratorId, email: "admin@nexa.test", displayName: null, role, isActive: true };
    },
  };
}

const property: Property = {
  id: propertyId,
  type: "house",
  publicationStatus: "draft",
  threeDStatus: "not_started",
  title: "Casa captura",
  slug: "casa-captura",
  summary: null,
  description: null,
  price: null,
  currency: "COP",
  areaSquareMeters: null,
  bedrooms: null,
  bathrooms: null,
  parkingSpaces: null,
  address: null,
  neighborhood: null,
  city: null,
  department: null,
  country: "Colombia",
  latitude: null,
  longitude: null,
  specifications: {},
  publishedAt: null,
  version: 1,
  createdAt: now,
  updatedAt: now,
};

const properties: PropertyRepository = {
  async list() { return { data: [property], pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 } }; },
  async findById(id) { return id === propertyId ? property : null; },
  async create() { throw new Error("not used"); },
  async update() { throw new Error("not used"); },
  async changePublicationStatus() { throw new Error("not used"); },
  async delete() {},
};

class MemoryCaptureRepository implements CaptureRepository {
  session: StoredCaptureSession | null = null;
  photos = new Map<string, StoredCapturePhoto>();

  async getSnapshot(propertyScope: string) {
    return this.session?.propertyId === propertyScope ? this.snapshot() : null;
  }

  async getOrCreateActiveSession(propertyScope: string) {
    this.session ??= {
      id: sessionId,
      propertyId: propertyScope,
      status: "active",
      totalPhotoCount: 0,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      rooms: [],
    };
    return this.snapshot();
  }

  async createRoom(propertyScope: string, input: CreateCaptureRoomData) {
    await this.getOrCreateActiveSession(propertyScope);
    const created: StoredCaptureRoom = {
      id: roomId,
      captureSessionId: sessionId,
      type: input.type,
      name: input.name,
      sortOrder: input.sortOrder ?? 0,
      photoCount: 0,
      photos: [],
      createdAt: now,
      updatedAt: now,
    };
    this.session?.rooms.push(created);
    return created;
  }

  async deleteRoom(propertyScope: string, targetRoomId: string) {
    const room = this.findRoom(propertyScope, targetRoomId);
    if (!room) throw new CaptureRoomNotFoundError();
    const keys = room.photos.map((photo) => photo.objectKey);
    this.session!.rooms = this.session!.rooms.filter((item) => item.id !== targetRoomId);
    return keys;
  }

  async createPendingPhoto(input: {
    propertyId: string;
    roomId: string;
    photoId: string;
    objectKey: string;
    metadata: CreateCapturePhotoUploadData;
    administratorId: string;
  }) {
    const room = this.findRoom(input.propertyId, input.roomId);
    if (!room) throw new CaptureRoomNotFoundError();
    const photo: StoredCapturePhoto = {
      id: input.photoId,
      captureRoomId: input.roomId,
      objectKey: input.objectKey,
      originalFileName: input.metadata.originalFileName,
      contentType: input.metadata.contentType,
      byteSize: input.metadata.byteSize,
      width: input.metadata.width ?? null,
      height: input.metadata.height ?? null,
      status: "pending",
      etag: null,
      capturedAt: input.metadata.capturedAt ?? null,
      createdAt: now,
      previewUrl: null,
    };
    room.photos.push(photo);
    this.photos.set(photo.id, photo);
    return photo;
  }

  async findPhoto(propertyScope: string, photoId: string) {
    const photo = this.photos.get(photoId) ?? null;
    return photo && this.findRoom(propertyScope, photo.captureRoomId) ? photo : null;
  }

  async markPhotoUploaded(propertyScope: string, photoId: string, metadata: { etag: string | null }) {
    const photo = await this.findPhoto(propertyScope, photoId);
    if (!photo) throw new CapturePhotoNotFoundError();
    photo.status = "uploaded";
    photo.etag = metadata.etag;
    const room = this.findRoom(propertyScope, photo.captureRoomId)!;
    room.photoCount = room.photos.filter((item) => item.status === "uploaded").length;
    return photo;
  }

  async markPhotoFailed(propertyScope: string, photoId: string) {
    const photo = await this.findPhoto(propertyScope, photoId);
    if (!photo) throw new CapturePhotoNotFoundError();
    photo.status = "failed";
  }

  async deletePhoto(propertyScope: string, photoId: string) {
    const photo = await this.findPhoto(propertyScope, photoId);
    if (!photo) throw new CapturePhotoNotFoundError();
    const room = this.findRoom(propertyScope, photo.captureRoomId)!;
    room.photos = room.photos.filter((item) => item.id !== photoId);
    room.photoCount = room.photos.filter((item) => item.status === "uploaded").length;
    this.photos.delete(photoId);
    return photo.objectKey;
  }

  private findRoom(propertyScope: string, targetRoomId: string) {
    if (this.session?.propertyId !== propertyScope) return null;
    return this.session.rooms.find((room) => room.id === targetRoomId) ?? null;
  }

  private snapshot(): StoredCaptureSession {
    const session = this.session!;
    return {
      ...session,
      totalPhotoCount: session.rooms.reduce((total, room) => total + room.photoCount, 0),
      rooms: session.rooms,
    };
  }
}

class MemoryStorage implements ObjectStorageProvider {
  objects = new Map<string, StoredObjectMetadata>();
  deleted: string[] = [];

  async createUploadUrl(input: { objectKey: string }) {
    return `https://storage.test/upload/${encodeURIComponent(input.objectKey)}`;
  }

  async createDownloadUrl(objectKey: string) {
    return `https://storage.test/preview/${encodeURIComponent(objectKey)}`;
  }

  async headObject(objectKey: string) {
    return this.objects.get(objectKey) ?? null;
  }

  async deleteObject(objectKey: string) {
    this.objects.delete(objectKey);
    this.deleted.push(objectKey);
  }
}

const applications: Awaited<ReturnType<typeof buildApp>>[] = [];
const authorization = { authorization: "Bearer valid-token" };

afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.close()));
});

async function application() {
  const captures = new MemoryCaptureRepository();
  const storage = new MemoryStorage();
  const app = await buildApp({
    tokenVerifier: verifier,
    adminProfiles: profiles("editor"),
    properties,
    captures,
    objectStorage: storage,
  });
  applications.push(app);
  return { app, captures, storage };
}

describe("capture administration routes", () => {
  it("creates a room and returns capture progress", async () => {
    const { app } = await application();
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/capture/rooms`,
      headers: authorization,
      payload: { type: "living_room", name: "Sala" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ data: { name: "Sala", photoCount: 0 } });

    const snapshot = await app.inject({
      method: "GET",
      url: `/api/v1/properties/${propertyId}/capture`,
      headers: authorization,
    });
    expect(snapshot.json()).toMatchObject({ data: { status: "active", totalPhotoCount: 0, rooms: [{ name: "Sala" }] } });
  });

  it("registers, verifies and deletes an uploaded photo", async () => {
    const { app, captures, storage } = await application();
    await captures.createRoom(propertyId, { type: "kitchen", name: "Cocina" }, administratorId);
    const ticket = await app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/capture/rooms/${roomId}/photos/upload-url`,
      headers: authorization,
      payload: { originalFileName: "cocina.jpg", contentType: "image/jpeg", byteSize: 2048 },
    });
    expect(ticket.statusCode).toBe(201);
    const photo = ticket.json().data.photo as CapturePhoto;
    const stored = await captures.findPhoto(propertyId, photo.id);
    storage.objects.set(stored!.objectKey, { contentLength: 2048, contentType: "image/jpeg", etag: "etag-1" });

    const completed = await app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/capture/photos/${photo.id}/complete`,
      headers: authorization,
      payload: {},
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json()).toMatchObject({ data: { status: "uploaded", previewUrl: expect.stringContaining("storage.test/preview") } });

    const deleted = await app.inject({
      method: "DELETE",
      url: `/api/v1/properties/${propertyId}/capture/photos/${photo.id}`,
      headers: authorization,
    });
    expect(deleted.statusCode).toBe(204);
    expect(storage.deleted).toContain(stored!.objectKey);
  });

  it("rejects an unverified or mismatched upload", async () => {
    const { app, captures } = await application();
    await captures.createRoom(propertyId, { type: "bathroom", name: "Baño" }, administratorId);
    const ticket = await app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/capture/rooms/${roomId}/photos/upload-url`,
      headers: authorization,
      payload: { originalFileName: "bano.jpg", contentType: "image/jpeg", byteSize: 1024 },
    });
    const photoId = ticket.json().data.photo.id as string;
    const completed = await app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/capture/photos/${photoId}/complete`,
      headers: authorization,
      payload: {},
    });
    expect(completed.statusCode).toBe(409);
    expect(completed.json()).toMatchObject({ code: "CAPTURE_UPLOAD_MISSING" });
  });
});
