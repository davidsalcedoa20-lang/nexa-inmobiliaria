import { z } from "zod";

export const threeDStatusValues = [
  "not_started",
  "uploading",
  "queued",
  "processing",
  "review_required",
  "ready",
  "failed",
] as const;

export const ThreeDStatusSchema = z.enum(threeDStatusValues);
export type ThreeDStatus = z.infer<typeof ThreeDStatusSchema>;

export const reconstructionProgressStageValues = [
  "queued",
  "downloading",
  "reconstructing",
  "texturing",
  "optimizing",
  "uploading",
  "complete",
] as const;
export const ReconstructionProgressStageSchema = z.enum(reconstructionProgressStageValues);
export type ReconstructionProgressStage = z.infer<typeof ReconstructionProgressStageSchema>;

export const ReconstructionJobSchema = z.object({
  id: z.uuid(),
  propertyId: z.uuid(),
  captureSessionId: z.uuid(),
  provider: z.string().min(1),
  providerJobId: z.string().nullable(),
  status: ThreeDStatusSchema,
  progressPercent: z.number().int().min(0).max(100),
  progressStage: ReconstructionProgressStageSchema,
  sourcePhotoCount: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(),
  attemptCount: z.number().int().nonnegative(),
  modelUrl: z.url().nullable(),
  modelByteSize: z.number().int().positive().nullable(),
  previewUrl: z.url().nullable(),
  startedAt: z.iso.datetime().nullable(),
  completedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const ThreeDStatusResponseSchema = z.object({
  propertyId: z.uuid(),
  status: ThreeDStatusSchema,
  latestJob: ReconstructionJobSchema.nullable(),
});

export type ReconstructionJob = z.infer<typeof ReconstructionJobSchema>;
export type ThreeDStatusResponse = z.infer<typeof ThreeDStatusResponseSchema>;

export const WorkerIdentitySchema = z.object({
  workerId: z.string().trim().min(3).max(100),
});

export const WorkerReconstructionPhotoSchema = z.object({
  id: z.uuid(),
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
});

export const WorkerReconstructionRoomSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  type: z.string().min(1),
  photos: z.array(WorkerReconstructionPhotoSchema),
});

export const WorkerReconstructionAssignmentSchema = z.object({
  jobId: z.uuid(),
  propertyId: z.uuid(),
  captureSessionId: z.uuid(),
  provider: z.string().min(1),
  attemptCount: z.number().int().positive(),
  rooms: z.array(WorkerReconstructionRoomSchema),
});

export const WorkerProgressUpdateSchema = z.object({
  workerId: z.string().trim().min(3).max(100),
  progressPercent: z.number().int().min(1).max(99),
  progressStage: ReconstructionProgressStageSchema.exclude(["queued", "complete"]),
});

export const WorkerCompleteJobSchema = z.object({
  workerId: z.string().trim().min(3).max(100),
  modelObjectKey: z.string().min(1),
  modelByteSize: z.number().int().positive(),
  previewObjectKey: z.string().min(1),
});

export const WorkerFailJobSchema = z.object({
  workerId: z.string().trim().min(3).max(100),
  errorMessage: z.string().trim().min(1).max(1000),
});

export type WorkerReconstructionAssignment = z.infer<typeof WorkerReconstructionAssignmentSchema>;
export type WorkerProgressUpdate = z.infer<typeof WorkerProgressUpdateSchema>;
export type WorkerCompleteJob = z.infer<typeof WorkerCompleteJobSchema>;
export type WorkerFailJob = z.infer<typeof WorkerFailJobSchema>;
