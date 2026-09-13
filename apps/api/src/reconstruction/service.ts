import type {
  ThreeDStatusResponse,
  WorkerCompleteJob,
  WorkerFailJob,
  WorkerProgressUpdate,
  WorkerReconstructionAssignment,
} from "@nexa/contracts";
import type { CaptureRepository } from "../capture/types.js";
import type { ObjectStorageProvider } from "../storage/types.js";
import {
  ReconstructionCaptureNotReadyError,
  ReconstructionPropertyNotFoundError,
  ReconstructionStateConflictError,
  type ReconstructionRepository,
  type StoredReconstructionJob,
  type StoredThreeDStatusResponse,
} from "./types.js";

const workerLeaseSeconds = 180;

export interface ReconstructionService {
  getStatus(propertyId: string): Promise<ThreeDStatusResponse>;
  prepare(propertyId: string, administratorId: string): Promise<ThreeDStatusResponse>;
  publish(propertyId: string, administratorId: string): Promise<ThreeDStatusResponse>;
  claim(workerId: string): Promise<WorkerReconstructionAssignment | null>;
  progress(jobId: string, input: WorkerProgressUpdate): Promise<void>;
  complete(jobId: string, input: WorkerCompleteJob): Promise<void>;
  fail(jobId: string, input: WorkerFailJob): Promise<void>;
}

export class ThreeDReconstructionService implements ReconstructionService {
  constructor(
    private readonly captures: CaptureRepository,
    private readonly reconstructions: ReconstructionRepository,
    private readonly objectStorage: ObjectStorageProvider,
    private readonly providerName = "local-colmap",
  ) {}

  async getStatus(propertyId: string) {
    const status = await this.reconstructions.getStatus(propertyId);
    if (!status) throw new ReconstructionPropertyNotFoundError();
    return this.publicStatus(status);
  }

  async prepare(propertyId: string, administratorId: string) {
    const capture = await this.captures.getSnapshot(propertyId);
    const sourcePhotoCount = capture?.rooms.reduce(
      (total, room) => total + room.photos.filter((photo) => photo.status === "uploaded").length,
      0,
    ) ?? 0;
    if (!capture || sourcePhotoCount === 0) throw new ReconstructionCaptureNotReadyError();

    await this.reconstructions.createQueuedJob({
      propertyId,
      captureSessionId: capture.id,
      provider: this.providerName,
      sourcePhotoCount,
      administratorId,
    });
    const status = await this.reconstructions.getStatus(propertyId);
    if (!status) throw new ReconstructionPropertyNotFoundError();
    return this.publicStatus(status);
  }

  async publish(propertyId: string, administratorId: string) {
    return this.publicStatus(await this.reconstructions.publish(propertyId, administratorId));
  }

  async claim(workerId: string): Promise<WorkerReconstructionAssignment | null> {
    const claimed = await this.reconstructions.claimNext(workerId, workerLeaseSeconds);
    if (!claimed) return null;
    const capture = await this.captures.getSessionSnapshot(claimed.propertyId, claimed.captureSessionId);
    if (!capture) {
      await this.reconstructions.fail(claimed.id, workerId, "La sesión de captura ya no existe");
      return null;
    }
    const rooms = capture.rooms.map((room) => ({
      id: room.id,
      name: room.name,
      type: room.type,
      photos: room.photos
        .filter((photo) => photo.status === "uploaded")
        .map((photo) => ({ id: photo.id, objectKey: photo.objectKey, contentType: photo.contentType })),
    }));
    if (rooms.every((room) => room.photos.length === 0)) {
      await this.reconstructions.fail(claimed.id, workerId, "La captura no contiene fotografías disponibles");
      return null;
    }
    return {
      jobId: claimed.id,
      propertyId: claimed.propertyId,
      captureSessionId: claimed.captureSessionId,
      provider: claimed.provider,
      attemptCount: claimed.attemptCount,
      rooms,
    };
  }

  progress(jobId: string, input: WorkerProgressUpdate) {
    return this.reconstructions.updateProgress({
      jobId,
      workerId: input.workerId,
      progressPercent: input.progressPercent,
      progressStage: input.progressStage,
      leaseSeconds: workerLeaseSeconds,
    });
  }

  async complete(jobId: string, input: WorkerCompleteJob) {
    const [model, preview] = await Promise.all([
      this.objectStorage.headObject(input.modelObjectKey),
      this.objectStorage.headObject(input.previewObjectKey),
    ]);
    if (!model || !preview || model.contentLength !== input.modelByteSize) {
      throw new ReconstructionStateConflictError();
    }
    await this.reconstructions.complete({ jobId, ...input });
  }

  fail(jobId: string, input: WorkerFailJob) {
    return this.reconstructions.fail(jobId, input.workerId, input.errorMessage);
  }

  private async publicStatus(status: StoredThreeDStatusResponse): Promise<ThreeDStatusResponse> {
    return {
      propertyId: status.propertyId,
      status: status.status,
      latestJob: status.latestJob ? await this.publicJob(status.latestJob) : null,
    };
  }

  private async publicJob(job: StoredReconstructionJob) {
    const [modelUrl, previewUrl] = await Promise.all([
      job.modelObjectKey ? this.objectStorage.createDownloadUrl(job.modelObjectKey, 3600) : null,
      job.previewObjectKey ? this.objectStorage.createDownloadUrl(job.previewObjectKey, 3600) : null,
    ]);
    const {
      modelObjectKey: _modelObjectKey,
      previewObjectKey: _previewObjectKey,
      workerId: _workerId,
      leaseExpiresAt: _leaseExpiresAt,
      heartbeatAt: _heartbeatAt,
      ...publicJob
    } = job;
    return { ...publicJob, modelUrl, previewUrl };
  }
}
