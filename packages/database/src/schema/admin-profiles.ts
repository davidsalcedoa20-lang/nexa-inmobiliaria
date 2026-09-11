import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { adminRole } from "./enums.js";

export const adminProfiles = pgTable("admin_profiles", {
  // This identifier mirrors auth.users.id. The API owns profile provisioning;
  // the managed Supabase auth schema is intentionally not managed by Drizzle.
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: adminRole("role").notNull().default("editor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}).enableRLS();

export type AdminProfileRecord = typeof adminProfiles.$inferSelect;
export type NewAdminProfileRecord = typeof adminProfiles.$inferInsert;
