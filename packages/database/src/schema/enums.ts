import { pgEnum } from "drizzle-orm/pg-core";

export const adminRole = pgEnum("admin_role", ["admin", "editor"]);
export const propertyType = pgEnum("property_type", ["house", "lot", "preconstruction"]);
export const publicationStatus = pgEnum("publication_status", [
  "draft",
  "published",
  "unpublished",
]);
export const currency = pgEnum("currency", ["COP", "USD"]);
