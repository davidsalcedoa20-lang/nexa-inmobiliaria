import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { adminProfiles } from "./admin-profiles.js";
import { captureSessions } from "./capture.js";
import { threeDStatus } from "./enums.js";
import { properties } from "./properties.js";

export const reconstructionJobs = pgTable(
  "reconstruction_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => properties.id, { onDelete: "cascade" }),
    captureSessionId: uuid("capture_session_id")
      .notNull()
      .references(() => captureSessions.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("mock"),
    providerJobId: text("provider_job_id"),
    status: threeDStatus("status").notNull().default("queued"),
    errorMessage: text("error_message"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => adminProfiles.id, { onDelete: "restrict" }),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("reconstruction_jobs_property_created_idx").on(table.propertyId, table.createdAt),
    index("reconstruction_jobs_capture_session_idx").on(table.captureSessionId),
    index("reconstruction_jobs_created_by_idx").on(table.createdBy),
    index("reconstruction_jobs_status_idx").on(table.status),
    uniqueIndex("reconstruction_jobs_one_active_per_property")
      .on(table.propertyId)
      .where(sql`${table.status} in ('queued', 'processing')`),
    check("reconstruction_jobs_provider_not_blank", sql`length(trim(${table.provider})) > 0`),
    check(
      "reconstruction_jobs_runnable_status",
      sql`${table.status} in ('queued', 'processing', 'review_required', 'ready', 'failed')`,
    ),
  ],
).enableRLS();

export type ReconstructionJobRecord = typeof reconstructionJobs.$inferSelect;
