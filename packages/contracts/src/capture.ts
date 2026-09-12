import { z } from "zod";

export const captureSessionStatusValues = ["active", "completed"] as const;
export const CaptureSessionStatusSchema = z.enum(captureSessionStatusValues);
export type CaptureSessionStatus = z.infer<typeof CaptureSessionStatusSchema>;

export const captureRoomTypeValues = [
  "living_room",
  "kitchen",
  "primary_bedroom",
  "bedroom",
  "bathroom",
  "hallway",
  "terrace",
  "exterior",
  "other",
] as const;
export const CaptureRoomTypeSchema = z.enum(captureRoomTypeValues);
export type CaptureRoomType = z.infer<typeof CaptureRoomTypeSchema>;

export const capturePhotoStatusValues = ["pending", "uploaded", "failed"] as const;
export const CapturePhotoStatusSchema = z.enum(capturePhotoStatusValues);
export type CapturePhotoStatus = z.infer<typeof CapturePhotoStatusSchema>;

export const CreateCaptureRoomSchema = z.object({
  type: CaptureRoomTypeSchema,
  name: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().nonnegative().optional(),
});

export const CreateCapturePhotoUploadSchema = z.object({
  originalFileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
  byteSize: z.number().int().positive().max(25 * 1024 * 1024),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  capturedAt: z.iso.datetime().nullable().optional(),
});

export const CapturePhotoSchema = z.object({
  id: z.uuid(),
  captureRoomId: z.uuid(),
  originalFileName: z.string(),
  contentType: z.string(),
  byteSize: z.number().int().positive(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  status: CapturePhotoStatusSchema,
  etag: z.string().nullable(),
  capturedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  previewUrl: z.url().nullable(),
});

export const CaptureRoomSchema = z.object({
  id: z.uuid(),
  captureSessionId: z.uuid(),
  type: CaptureRoomTypeSchema,
  name: z.string(),
  sortOrder: z.number().int().nonnegative(),
  photoCount: z.number().int().nonnegative(),
  photos: z.array(CapturePhotoSchema),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const CaptureSessionSchema = z.object({
  id: z.uuid(),
  propertyId: z.uuid(),
  status: CaptureSessionStatusSchema,
  totalPhotoCount: z.number().int().nonnegative(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  rooms: z.array(CaptureRoomSchema),
});

export const CaptureUploadTicketSchema = z.object({
  photo: CapturePhotoSchema,
  uploadUrl: z.url(),
  expiresAt: z.iso.datetime(),
});

export type CreateCaptureRoomInput = z.input<typeof CreateCaptureRoomSchema>;
export type CreateCaptureRoomData = z.output<typeof CreateCaptureRoomSchema>;
export type CreateCapturePhotoUploadInput = z.input<typeof CreateCapturePhotoUploadSchema>;
export type CreateCapturePhotoUploadData = z.output<typeof CreateCapturePhotoUploadSchema>;
export type CapturePhoto = z.infer<typeof CapturePhotoSchema>;
export type CaptureRoom = z.infer<typeof CaptureRoomSchema>;
export type CaptureSession = z.infer<typeof CaptureSessionSchema>;
export type CaptureUploadTicket = z.infer<typeof CaptureUploadTicketSchema>;
