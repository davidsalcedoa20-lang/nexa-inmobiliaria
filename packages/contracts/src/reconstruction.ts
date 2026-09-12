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

export const ReconstructionJobSchema = z.object({
  id: z.uuid(),
  propertyId: z.uuid(),
  captureSessionId: z.uuid(),
  provider: z.string().min(1),
  providerJobId: z.string().nullable(),
  status: ThreeDStatusSchema,
  errorMessage: z.string().nullable(),
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
