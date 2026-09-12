CREATE TYPE "public"."capture_photo_status" AS ENUM('pending', 'uploaded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."capture_room_type" AS ENUM('living_room', 'kitchen', 'primary_bedroom', 'bedroom', 'bathroom', 'hallway', 'terrace', 'exterior', 'other');--> statement-breakpoint
CREATE TYPE "public"."capture_session_status" AS ENUM('active', 'completed');--> statement-breakpoint
CREATE TABLE "capture_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capture_room_id" uuid NOT NULL,
	"object_key" text NOT NULL,
	"original_file_name" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"width" integer,
	"height" integer,
	"status" "capture_photo_status" DEFAULT 'pending' NOT NULL,
	"etag" text,
	"captured_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_photos_byte_size_valid" CHECK ("capture_photos"."byte_size" > 0 and "capture_photos"."byte_size" <= 26214400),
	CONSTRAINT "capture_photos_width_positive" CHECK ("capture_photos"."width" is null or "capture_photos"."width" > 0),
	CONSTRAINT "capture_photos_height_positive" CHECK ("capture_photos"."height" is null or "capture_photos"."height" > 0),
	CONSTRAINT "capture_photos_content_type_allowed" CHECK ("capture_photos"."content_type" in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'))
);
--> statement-breakpoint
ALTER TABLE "capture_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "capture_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"capture_session_id" uuid NOT NULL,
	"type" "capture_room_type" NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capture_rooms_sort_order_non_negative" CHECK ("capture_rooms"."sort_order" >= 0),
	CONSTRAINT "capture_rooms_name_not_blank" CHECK (length(trim("capture_rooms"."name")) > 0)
);
--> statement-breakpoint
ALTER TABLE "capture_rooms" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "capture_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"status" "capture_session_status" DEFAULT 'active' NOT NULL,
	"created_by" uuid NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "capture_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "capture_photos" ADD CONSTRAINT "capture_photos_capture_room_id_capture_rooms_id_fk" FOREIGN KEY ("capture_room_id") REFERENCES "public"."capture_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_photos" ADD CONSTRAINT "capture_photos_created_by_admin_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_rooms" ADD CONSTRAINT "capture_rooms_capture_session_id_capture_sessions_id_fk" FOREIGN KEY ("capture_session_id") REFERENCES "public"."capture_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_sessions" ADD CONSTRAINT "capture_sessions_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capture_sessions" ADD CONSTRAINT "capture_sessions_created_by_admin_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "capture_photos_object_key_unique" ON "capture_photos" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "capture_photos_room_created_idx" ON "capture_photos" USING btree ("capture_room_id","created_at");--> statement-breakpoint
CREATE INDEX "capture_photos_status_idx" ON "capture_photos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "capture_rooms_session_sort_idx" ON "capture_rooms" USING btree ("capture_session_id","sort_order");--> statement-breakpoint
CREATE INDEX "capture_sessions_property_created_idx" ON "capture_sessions" USING btree ("property_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "capture_sessions_one_active_per_property" ON "capture_sessions" USING btree ("property_id") WHERE "capture_sessions"."status" = 'active';--> statement-breakpoint
REVOKE ALL ON TABLE "capture_sessions" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "capture_rooms" FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON TABLE "capture_photos" FROM anon, authenticated;
