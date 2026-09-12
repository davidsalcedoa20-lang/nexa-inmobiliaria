import { pgEnum } from "drizzle-orm/pg-core";

export const adminRole = pgEnum("admin_role", ["admin", "editor"]);
export const propertyType = pgEnum("property_type", ["house", "lot", "preconstruction"]);
export const publicationStatus = pgEnum("publication_status", [
  "draft",
  "published",
  "unpublished",
]);
export const currency = pgEnum("currency", ["COP", "USD"]);
export const captureSessionStatus = pgEnum("capture_session_status", ["active", "completed"]);
export const captureRoomType = pgEnum("capture_room_type", [
  "living_room",
  "kitchen",
  "primary_bedroom",
  "bedroom",
  "bathroom",
  "hallway",
  "terrace",
  "exterior",
  "other",
]);
export const capturePhotoStatus = pgEnum("capture_photo_status", [
  "pending",
  "uploaded",
  "failed",
]);
export const threeDStatus = pgEnum("three_d_status", [
  "not_started",
  "uploading",
  "queued",
  "processing",
  "review_required",
  "ready",
  "failed",
]);
