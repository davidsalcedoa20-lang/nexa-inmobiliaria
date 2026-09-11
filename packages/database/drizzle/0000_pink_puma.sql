CREATE TYPE "public"."admin_role" AS ENUM('admin', 'editor');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('COP', 'USD');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('house', 'lot', 'preconstruction');--> statement-breakpoint
CREATE TYPE "public"."publication_status" AS ENUM('draft', 'published', 'unpublished');--> statement-breakpoint
CREATE TABLE "admin_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"role" "admin_role" DEFAULT 'editor' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "property_type" NOT NULL,
	"publication_status" "publication_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"description" text,
	"price" numeric(16, 2),
	"currency" "currency" DEFAULT 'COP' NOT NULL,
	"area_square_meters" numeric(12, 2),
	"bedrooms" integer,
	"bathrooms" numeric(4, 1),
	"parking_spaces" integer,
	"address" text,
	"neighborhood" text,
	"city" text,
	"department" text,
	"country" text DEFAULT 'Colombia' NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "properties_price_non_negative" CHECK ("properties"."price" is null or "properties"."price" >= 0),
	CONSTRAINT "properties_area_positive" CHECK ("properties"."area_square_meters" is null or "properties"."area_square_meters" > 0),
	CONSTRAINT "properties_bedrooms_non_negative" CHECK ("properties"."bedrooms" is null or "properties"."bedrooms" >= 0),
	CONSTRAINT "properties_bathrooms_non_negative" CHECK ("properties"."bathrooms" is null or "properties"."bathrooms" >= 0),
	CONSTRAINT "properties_parking_non_negative" CHECK ("properties"."parking_spaces" is null or "properties"."parking_spaces" >= 0),
	CONSTRAINT "properties_version_positive" CHECK ("properties"."version" > 0)
);
--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_created_by_admin_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "properties" ADD CONSTRAINT "properties_updated_by_admin_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admin_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "properties_slug_unique" ON "properties" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "properties_type_idx" ON "properties" USING btree ("type");--> statement-breakpoint
CREATE INDEX "properties_publication_status_idx" ON "properties" USING btree ("publication_status");--> statement-breakpoint
CREATE INDEX "properties_city_idx" ON "properties" USING btree ("city");