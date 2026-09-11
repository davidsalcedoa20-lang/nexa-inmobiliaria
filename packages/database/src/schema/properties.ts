import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { adminProfiles } from "./admin-profiles.js";
import { currency, propertyType, publicationStatus } from "./enums.js";

export const properties = pgTable(
  "properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: propertyType("type").notNull(),
    publicationStatus: publicationStatus("publication_status").notNull().default("draft"),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary"),
    description: text("description"),
    price: numeric("price", { precision: 16, scale: 2 }),
    currency: currency("currency").notNull().default("COP"),
    areaSquareMeters: numeric("area_square_meters", { precision: 12, scale: 2 }),
    bedrooms: integer("bedrooms"),
    bathrooms: numeric("bathrooms", { precision: 4, scale: 1 }),
    parkingSpaces: integer("parking_spaces"),
    address: text("address"),
    neighborhood: text("neighborhood"),
    city: text("city"),
    department: text("department"),
    country: text("country").notNull().default("Colombia"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    specifications: jsonb("specifications")
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    version: integer("version").notNull().default(1),
    publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => adminProfiles.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => adminProfiles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("properties_slug_unique").on(table.slug),
    index("properties_type_idx").on(table.type),
    index("properties_publication_status_idx").on(table.publicationStatus),
    index("properties_city_idx").on(table.city),
    check("properties_price_non_negative", sql`${table.price} is null or ${table.price} >= 0`),
    check(
      "properties_area_positive",
      sql`${table.areaSquareMeters} is null or ${table.areaSquareMeters} > 0`,
    ),
    check("properties_bedrooms_non_negative", sql`${table.bedrooms} is null or ${table.bedrooms} >= 0`),
    check(
      "properties_bathrooms_non_negative",
      sql`${table.bathrooms} is null or ${table.bathrooms} >= 0`,
    ),
    check(
      "properties_parking_non_negative",
      sql`${table.parkingSpaces} is null or ${table.parkingSpaces} >= 0`,
    ),
    check("properties_version_positive", sql`${table.version} > 0`),
  ],
).enableRLS();

export type PropertyRecord = typeof properties.$inferSelect;
export type NewPropertyRecord = typeof properties.$inferInsert;
