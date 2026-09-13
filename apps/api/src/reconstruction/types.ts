import type {
  ReconstructionJob,
  ReconstructionProgressStage,
  ThreeDStatusResponse,
} from "@nexa/contracts";

export type StoredReconstructionJob = ReconstructionJob & {
  modelObjectKey: string | null;
  previewObjectKey: string | null;
  workerId: string | null;
  leaseExpiresAt: string | null;
  heartbeatAt: string | null;
};

export type StoredThreeDStatusResponse = Omit<ThreeDStatusResponse, "latestJob"> & {
  latestJob: StoredReconstructionJob | null;
};

export interface ReconstructionRepository {
  getStatus(propertyId: string): Promise<StoredThreeDStatusResponse | null>;
  createQueuedJob(input: {
    propertyId: string;
    captureSessionId: string;
    provider: string;
    sourcePhotoCount: number;
    administratorId: string;
  }): Promise<StoredReconstructionJob>;
  claimNext(workerId: string, leaseSeconds: number): Promise<StoredReconstructionJob | null>;
  updateProgress(input: {
    jobId: string;
    workerId: string;
    progressPercent: number;
    progressStage: ReconstructionProgressStage;
    leaseSeconds: number;
  }): Promise<void>;
  complete(input: {
    jobId: string;
    workerId: string;
    modelObjectKey: string;
    modelByteSize: number;
    previewObjectKey: string;
  }): Promise<void>;
  fail(jobId: string, workerId: string, errorMessage: string): Promise<void>;
  publish(propertyId: string, administratorId: string): Promise<StoredThreeDStatusResponse>;
}

export class ReconstructionPropertyNotFoundError extends Error {}
export class ReconstructionStateConflictError extends Error {}
export class ReconstructionCaptureNotReadyError extends Error {}
export class ReconstructionWorkerUnauthorizedError extends Error {}
