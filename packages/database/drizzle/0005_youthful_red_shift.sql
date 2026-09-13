ALTER TABLE "reconstruction_jobs" ADD COLUMN "progress_percent" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "progress_stage" text DEFAULT 'queued' NOT NULL;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "source_photo_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "worker_id" text;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "model_object_key" text;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "model_byte_size" integer;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD COLUMN "preview_object_key" text;--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD CONSTRAINT "reconstruction_jobs_progress_valid" CHECK ("reconstruction_jobs"."progress_percent" between 0 and 100);--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD CONSTRAINT "reconstruction_jobs_source_photo_count_valid" CHECK ("reconstruction_jobs"."source_photo_count" >= 0);--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD CONSTRAINT "reconstruction_jobs_attempt_count_valid" CHECK ("reconstruction_jobs"."attempt_count" >= 0);--> statement-breakpoint
ALTER TABLE "reconstruction_jobs" ADD CONSTRAINT "reconstruction_jobs_model_byte_size_valid" CHECK ("reconstruction_jobs"."model_byte_size" is null or "reconstruction_jobs"."model_byte_size" > 0);