CREATE TYPE "public"."three_d_status" AS ENUM('not_started', 'uploading', 'queued', 'processing', 'review_required', 'ready', 'failed');--> statement-breakpoint
CREATE TABLE "reconstruction_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"capture_session_id" uuid NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"provider_job_id" text,
	"status" "three_d_status" DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"created_by" uuid NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reconstruction_jobs_provider_not_blank" CHECK (length(trim("reconstruction_jobs"."provider")) > 0),
	CONSTRAINT "reconstruction_jobs_runnable_status" CHECK ("reconstruction_jobs"."status" in ('queued', 'processing', 'review_required', 'ready', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "three_d_status" "three_d_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD CONSTRAINT "reconstruction_jobs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD CONSTRAINT "reconstruction_jobs_capture_session_id_capture_sessions_id_fk" FOREIGN KEY ("capture_session_id") REFERENCES "public"."capture_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD CONSTRAINT "reconstruction_jobs_created_by_admin_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admin_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reconstruction_jobs_property_created_idx" ON "reconstruction_jobs" USING btree ("property_id","created_at");--> statement-breakpoint
CREATE INDEX "reconstruction_jobs_capture_session_idx" ON "reconstruction_jobs" USING btree ("capture_session_id");--> statement-breakpoint
CREATE INDEX "reconstruction_jobs_created_by_idx" ON "reconstruction_jobs" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "reconstruction_jobs_status_idx" ON "reconstruction_jobs" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reconstruction_jobs_one_active_per_property" ON "reconstruction_jobs" USING btree ("property_id") WHERE "reconstruction_jobs"."status" in ('queued', 'processing');--> statement-breakpoint
CREATE INDEX "properties_three_d_status_idx" ON "properties" USING btree ("three_d_status");--> statement-breakpoint
REVOKE ALL ON TABLE "reconstruction_jobs" FROM anon, authenticated;
