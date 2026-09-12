import type {
  CapturePhotoRecord,
  CaptureRoomRecord,
  CaptureSessionRecord,
  Database,
} from "@nexa/database";
import {
  capturePhotos,
  captureRooms,
  captureSessions,
} from "@nexa/database";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { CreateCapturePhotoUploadData, CreateCaptureRoomData } from "@nexa/contracts";
import {
  CapturePhotoNotFoundError,
  CaptureRoomNotFoundError,
  type CaptureRepository,
  type StoredCapturePhoto,
  type StoredCaptureRoom,
  type StoredCaptureSession,
} from "./types.js";

function photo(record: CapturePhotoRecord): StoredCapturePhoto {
  return {
    id: record.id,
    captureRoomId: record.captureRoomId,
    originalFileName: record.originalFileName,
    contentType: record.contentType,
    byteSize: record.byteSize,
    width: record.width,
    height: record.height,
    status: record.status,
    etag: record.etag,
    capturedAt: record.capturedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    previewUrl: null,
    objectKey: record.objectKey,
  };
}

function room(record: CaptureRoomRecord, photos: StoredCapturePhoto[] = []): StoredCaptureRoom {
  const uploaded = photos.filter((item) => item.status === "uploaded");
  return {
    id: record.id,
    captureSessionId: record.captureSessionId,
    type: record.type,
    name: record.name,
    sortOrder: record.sortOrder,
    photoCount: uploaded.length,
    photos,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function session(
  record: CaptureSessionRecord,
  rooms: StoredCaptureRoom[] = [],
): StoredCaptureSession {
  return {
    id: record.id,
    propertyId: record.propertyId,
    status: record.status,
    totalPhotoCount: rooms.reduce((total, item) => total + item.photoCount, 0),
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    rooms,
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export class DrizzleCaptureRepository implements CaptureRepository {
  constructor(private readonly database: Database) {}

  async getSnapshot(propertyId: string): Promise<StoredCaptureSession | null> {
    const record = await this.findLatestSession(propertyId);
    if (!record) return null;

    const roomRecords = await this.database
      .select()
      .from(captureRooms)
      .where(eq(captureRooms.captureSessionId, record.id))
      .orderBy(asc(captureRooms.sortOrder), asc(captureRooms.createdAt));
    if (roomRecords.length === 0) return session(record);

    const roomIds = roomRecords.map((item) => item.id);
    const photoRecords = await this.database
      .select()
      .from(capturePhotos)
      .where(inArray(capturePhotos.captureRoomId, roomIds))
      .orderBy(asc(capturePhotos.createdAt));
    const photosByRoom = new Map<string, StoredCapturePhoto[]>();
    for (const record of photoRecords) {
      const current = photosByRoom.get(record.captureRoomId) ?? [];
      current.push(photo(record));
      photosByRoom.set(record.captureRoomId, current);
    }
    return session(
      record,
      roomRecords.map((item) => room(item, photosByRoom.get(item.id) ?? [])),
    );
  }

  async getOrCreateActiveSession(propertyId: string, administratorId: string) {
    const existing = await this.findActiveSession(propertyId);
    if (existing) return (await this.getSnapshot(propertyId)) ?? session(existing);

    try {
      const [created] = await this.database
        .insert(captureSessions)
        .values({ propertyId, createdBy: administratorId })
        .returning();
      if (!created) throw new Error("No fue posible crear la sesión de captura");
      return session(created);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const concurrent = await this.findActiveSession(propertyId);
      if (!concurrent) throw error;
      return (await this.getSnapshot(propertyId)) ?? session(concurrent);
    }
  }

  async createRoom(
    propertyId: string,
    input: CreateCaptureRoomData,
    administratorId: string,
  ) {
    const current = await this.getOrCreateActiveSession(propertyId, administratorId);
    const [created] = await this.database
      .insert(captureRooms)
      .values({
        captureSessionId: current.id,
        type: input.type,
        name: input.name,
        sortOrder: input.sortOrder ?? current.rooms.length,
      })
      .returning();
    if (!created) throw new Error("No fue posible crear la habitación");
    return room(created);
  }

  async deleteRoom(propertyId: string, roomId: string) {
    const scoped = await this.findRoom(propertyId, roomId);
    if (!scoped) throw new CaptureRoomNotFoundError();
    const objects = await this.database
      .select({ objectKey: capturePhotos.objectKey })
      .from(capturePhotos)
      .where(eq(capturePhotos.captureRoomId, roomId));
    await this.database.delete(captureRooms).where(eq(captureRooms.id, roomId));
    return objects.map((item) => item.objectKey);
  }

  async createPendingPhoto(input: {
    propertyId: string;
    roomId: string;
    photoId: string;
    objectKey: string;
    metadata: CreateCapturePhotoUploadData;
    administratorId: string;
  }) {
    const scoped = await this.findRoom(input.propertyId, input.roomId);
    if (!scoped) throw new CaptureRoomNotFoundError();
    const [created] = await this.database
      .insert(capturePhotos)
      .values({
        id: input.photoId,
        captureRoomId: input.roomId,
        objectKey: input.objectKey,
        originalFileName: input.metadata.originalFileName,
        contentType: input.metadata.contentType,
        byteSize: input.metadata.byteSize,
        width: input.metadata.width ?? null,
        height: input.metadata.height ?? null,
        capturedAt: input.metadata.capturedAt ? new Date(input.metadata.capturedAt) : null,
        createdBy: input.administratorId,
      })
      .returning();
    if (!created) throw new Error("No fue posible registrar la fotografía");
    return photo(created);
  }

  async findPhoto(propertyId: string, photoId: string) {
    const [record] = await this.database
      .select({ photo: capturePhotos })
      .from(capturePhotos)
      .innerJoin(captureRooms, eq(capturePhotos.captureRoomId, captureRooms.id))
      .innerJoin(captureSessions, eq(captureRooms.captureSessionId, captureSessions.id))
      .where(and(eq(capturePhotos.id, photoId), eq(captureSessions.propertyId, propertyId)))
      .limit(1);
    return record ? photo(record.photo) : null;
  }

  async markPhotoUploaded(propertyId: string, photoId: string, metadata: { etag: string | null }) {
    const existing = await this.findPhoto(propertyId, photoId);
    if (!existing) throw new CapturePhotoNotFoundError();
    const [updated] = await this.database
      .update(capturePhotos)
      .set({ status: "uploaded", etag: metadata.etag, updatedAt: new Date() })
      .where(eq(capturePhotos.id, photoId))
      .returning();
    if (!updated) throw new CapturePhotoNotFoundError();
    return photo(updated);
  }

  async markPhotoFailed(propertyId: string, photoId: string) {
    const existing = await this.findPhoto(propertyId, photoId);
    if (!existing) throw new CapturePhotoNotFoundError();
    await this.database
      .update(capturePhotos)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(capturePhotos.id, photoId));
  }

  async deletePhoto(propertyId: string, photoId: string) {
    const existing = await this.findPhoto(propertyId, photoId);
    if (!existing) throw new CapturePhotoNotFoundError();
    await this.database.delete(capturePhotos).where(eq(capturePhotos.id, photoId));
    return existing.objectKey;
  }

  private async findActiveSession(propertyId: string) {
    const [record] = await this.database
      .select()
      .from(captureSessions)
      .where(and(eq(captureSessions.propertyId, propertyId), eq(captureSessions.status, "active")))
      .orderBy(desc(captureSessions.createdAt))
      .limit(1);
    return record ?? null;
  }

  private async findLatestSession(propertyId: string) {
    const [record] = await this.database
      .select()
      .from(captureSessions)
      .where(eq(captureSessions.propertyId, propertyId))
      .orderBy(desc(captureSessions.createdAt))
      .limit(1);
    return record ?? null;
  }

  private async findRoom(propertyId: string, roomId: string) {
    const [record] = await this.database
      .select({ room: captureRooms })
      .from(captureRooms)
      .innerJoin(captureSessions, eq(captureRooms.captureSessionId, captureSessions.id))
      .where(and(eq(captureRooms.id, roomId), eq(captureSessions.propertyId, propertyId)))
      .limit(1);
    return record?.room ?? null;
  }
}
