import type { ReconstructionJob, ThreeDStatusResponse } from "@nexa/contracts";

export interface ReconstructionRepository {
  getStatus(propertyId: string): Promise<ThreeDStatusResponse | null>;
  createQueuedJob(input: {
    propertyId: string;
    captureSessionId: string;
    provider: string;
    administratorId: string;
  }): Promise<ReconstructionJob>;
  markProcessing(jobId: string, administratorId: string): Promise<ReconstructionJob>;
  markReviewRequired(
    jobId: string,
    providerJobId: string,
    administratorId: string,
  ): Promise<ReconstructionJob>;
  markFailed(jobId: string, errorMessage: string, administratorId: string): Promise<void>;
  publish(propertyId: string, administratorId: string): Promise<ThreeDStatusResponse>;
}

export class ReconstructionPropertyNotFoundError extends Error {}
export class ReconstructionStateConflictError extends Error {}
export class ReconstructionCaptureNotReadyError extends Error {}
export class ReconstructionProviderError extends Error {}
