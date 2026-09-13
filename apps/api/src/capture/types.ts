import type {
  CapturePhoto,
  CaptureRoom,
  CaptureSession,
  CreateCapturePhotoUploadData,
  CreateCaptureRoomData,
} from "@nexa/contracts";

export type StoredCapturePhoto = CapturePhoto & { objectKey: string };
export type StoredCaptureRoom = Omit<CaptureRoom, "photos"> & { photos: StoredCapturePhoto[] };
export type StoredCaptureSession = Omit<CaptureSession, "rooms"> & {
  rooms: StoredCaptureRoom[];
};

export interface CaptureRepository {
  getSnapshot(propertyId: string): Promise<StoredCaptureSession | null>;
  getSessionSnapshot(propertyId: string, sessionId: string): Promise<StoredCaptureSession | null>;
  getOrCreateActiveSession(propertyId: string, administratorId: string): Promise<StoredCaptureSession>;
  createRoom(
    propertyId: string,
    input: CreateCaptureRoomData,
    administratorId: string,
  ): Promise<StoredCaptureRoom>;
  deleteRoom(propertyId: string, roomId: string): Promise<string[]>;
  createPendingPhoto(input: {
    propertyId: string;
    roomId: string;
    photoId: string;
    objectKey: string;
    metadata: CreateCapturePhotoUploadData;
    administratorId: string;
  }): Promise<StoredCapturePhoto>;
  findPhoto(propertyId: string, photoId: string): Promise<StoredCapturePhoto | null>;
  markPhotoUploaded(
    propertyId: string,
    photoId: string,
    metadata: { etag: string | null },
  ): Promise<StoredCapturePhoto>;
  markPhotoFailed(propertyId: string, photoId: string): Promise<void>;
  deletePhoto(propertyId: string, photoId: string): Promise<string>;
}

export class CaptureRoomNotFoundError extends Error {}
export class CapturePhotoNotFoundError extends Error {}
export class CaptureUploadMissingError extends Error {}
export class CaptureUploadMismatchError extends Error {}
export class CapturePhotoLimitError extends Error {}
