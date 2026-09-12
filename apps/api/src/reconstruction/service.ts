import type { ThreeDStatusResponse } from "@nexa/contracts";
import type { CaptureRepository } from "../capture/types.js";
import type { ThreeDReconstructionProvider } from "./provider.js";
import {
  ReconstructionCaptureNotReadyError,
  ReconstructionPropertyNotFoundError,
  ReconstructionProviderError,
  type ReconstructionRepository,
} from "./types.js";

export interface ReconstructionService {
  getStatus(propertyId: string): Promise<ThreeDStatusResponse>;
  prepare(propertyId: string, administratorId: string): Promise<ThreeDStatusResponse>;
  publish(propertyId: string, administratorId: string): Promise<ThreeDStatusResponse>;
}

export class ThreeDReconstructionService implements ReconstructionService {
  constructor(
    private readonly captures: CaptureRepository,
    private readonly reconstructions: ReconstructionRepository,
    private readonly provider: ThreeDReconstructionProvider,
  ) {}

  async getStatus(propertyId: string) {
    const status = await this.reconstructions.getStatus(propertyId);
    if (!status) throw new ReconstructionPropertyNotFoundError();
    return status;
  }

  async prepare(propertyId: string, administratorId: string) {
    const capture = await this.captures.getSnapshot(propertyId);
    if (!capture || capture.totalPhotoCount === 0) {
      throw new ReconstructionCaptureNotReadyError();
    }

    const queued = await this.reconstructions.createQueuedJob({
      propertyId,
      captureSessionId: capture.id,
      provider: this.provider.name,
      administratorId,
    });

    try {
      await this.reconstructions.markProcessing(queued.id, administratorId);
      const result = await this.provider.prepare({
        jobId: queued.id,
        propertyId,
        captureSessionId: capture.id,
        rooms: capture.rooms.map((room) => ({
          id: room.id,
          name: room.name,
          type: room.type,
          photos: room.photos
            .filter((photo) => photo.status === "uploaded")
            .map((photo) => ({
              id: photo.id,
              objectKey: photo.objectKey,
              contentType: photo.contentType,
            })),
        })),
      });
      const reviewed = await this.reconstructions.markReviewRequired(
        queued.id,
        result.providerJobId,
        administratorId,
      );
      return { propertyId, status: "review_required" as const, latestJob: reviewed };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "El proveedor 3D no respondió";
      await this.reconstructions.markFailed(queued.id, detail, administratorId);
      throw new ReconstructionProviderError(detail);
    }
  }

  publish(propertyId: string, administratorId: string) {
    return this.reconstructions.publish(propertyId, administratorId);
  }
}
