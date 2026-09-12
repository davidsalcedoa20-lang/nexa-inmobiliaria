import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { adminProfiles } from "./admin-profiles.js";
import { capturePhotoStatus, captureRoomType, captureSessionStatus } from "./enums.js";
import { properties } from "./properties.js";

export const captureSessions = pgTable(
  "capture_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    status: captureSessionStatus("status").notNull().default("active"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => adminProfiles.id, { onDelete: "restrict" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("capture_sessions_property_created_idx").on(table.propertyId, table.createdAt),
    index("capture_sessions_created_by_idx").on(table.createdBy),
    uniqueIndex("capture_sessions_one_active_per_property")
      .on(table.propertyId)
      .where(sql`${table.status} = 'active'`),
  ],
).enableRLS();

export const captureRooms = pgTable(
  "capture_rooms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    captureSessionId: uuid("capture_session_id")
      .notNull()
      .references(() => captureSessions.id, { onDelete: "cascade" }),
    type: captureRoomType("type").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("capture_rooms_session_sort_idx").on(table.captureSessionId, table.sortOrder),
    check("capture_rooms_sort_order_non_negative", sql`${table.sortOrder} >= 0`),
    check("capture_rooms_name_not_blank", sql`length(trim(${table.name})) > 0`),
  ],
).enableRLS();

export const capturePhotos = pgTable(
  "capture_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    captureRoomId: uuid("capture_room_id")
      .notNull()
      .references(() => captureRooms.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    originalFileName: text("original_file_name").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    status: capturePhotoStatus("status").notNull().default("pending"),
    etag: text("etag"),
    capturedAt: timestamp("captured_at", { withTimezone: true, mode: "date" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => adminProfiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("capture_photos_object_key_unique").on(table.objectKey),
    index("capture_photos_room_created_idx").on(table.captureRoomId, table.createdAt),
    index("capture_photos_created_by_idx").on(table.createdBy),
    index("capture_photos_status_idx").on(table.status),
    check(
      "capture_photos_byte_size_valid",
      sql`${table.byteSize} > 0 and ${table.byteSize} <= 26214400`,
    ),
    check("capture_photos_width_positive", sql`${table.width} is null or ${table.width} > 0`),
    check("capture_photos_height_positive", sql`${table.height} is null or ${table.height} > 0`),
    check(
      "capture_photos_content_type_allowed",
      sql`${table.contentType} in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif')`,
    ),
  ],
).enableRLS();

export type CaptureSessionRecord = typeof captureSessions.$inferSelect;
export type CaptureRoomRecord = typeof captureRooms.$inferSelect;
export type CapturePhotoRecord = typeof capturePhotos.$inferSelect;
