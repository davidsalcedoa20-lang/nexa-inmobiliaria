import type {
  AdminRole,
  ReconstructionJob,
  ThreeDStatus,
  ThreeDStatusResponse,
} from "@nexa/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../application.js";
import type { AdminProfileRepository, TokenVerifier } from "../auth/types.js";
import type { CaptureRepository, StoredCaptureSession } from "../capture/types.js";
import type { PropertyRepository } from "../properties/types.js";
import type {
  ThreeDReconstructionInput,
  ThreeDReconstructionProvider,
} from "../reconstruction/provider.js";
import { MockThreeDReconstructionProvider } from "../reconstruction/provider.js";
import { ThreeDReconstructionService } from "../reconstruction/service.js";
import {
  type ReconstructionRepository,
  ReconstructionStateConflictError,
} from "../reconstruction/types.js";

const administratorId = "78d49554-e1e2-4fd0-b9e2-a728bb8fdd2c";
const propertyId = "231f15f9-877c-464f-ae32-e1b8f7446987";
const sessionId = "b25ae061-a2c9-499c-ad91-b208a4c8c58e";
const roomId = "9163ba36-97ac-4c99-b25e-7088050c3437";
const photoId = "9a472099-04f5-4054-8801-ef98ee2f417a";
const jobId = "0152b9c1-81c8-4d6d-a2a4-c5491e6186d6";
const now = "2026-09-12T18:00:00.000Z";

const verifier: TokenVerifier = {
  async verify(token) {
    if (token !== "valid-token") throw new Error("invalid");
    return { userId: administratorId, email: "admin@nexa.test" };
  },
};

function profiles(role: AdminRole): AdminProfileRepository {
  return {
    async findActiveByUserId() {
      return { id: administratorId, email: "admin@nexa.test", displayName: null, role, isActive: true };
    },
  };
}

const properties: PropertyRepository = {
  async list() { return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } }; },
  async findById() { return null; },
  async create() { throw new Error("not used"); },
  async update() { throw new Error("not used"); },
  async changePublicationStatus() { throw new Error("not used"); },
  async delete() {},
};

function capture(photoCount = 1): StoredCaptureSession {
  return {
    id: sessionId,
    propertyId,
    status: "active",
    totalPhotoCount: photoCount,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    rooms: [
      {
        id: roomId,
        captureSessionId: sessionId,
        type: "living_room",
        name: "Sala",
        sortOrder: 0,
        photoCount,
        createdAt: now,
        updatedAt: now,
        photos: photoCount === 0 ? [] : [
          {
            id: photoId,
            captureRoomId: roomId,
            objectKey: `properties/${propertyId}/capture/${photoId}.jpg`,
            originalFileName: "sala.jpg",
            contentType: "image/jpeg",
            byteSize: 2048,
            width: 100,
            height: 100,
            status: "uploaded",
            etag: "etag",
            capturedAt: now,
            createdAt: now,
            previewUrl: null,
          },
        ],
      },
    ],
  };
}

class CaptureStub implements CaptureRepository {
  constructor(private readonly snapshot: StoredCaptureSession | null) {}
  async getSnapshot() { return this.snapshot; }
  async getOrCreateActiveSession() { throw new Error("not used"); }
  async createRoom() { throw new Error("not used"); }
  async deleteRoom() { throw new Error("not used"); }
  async createPendingPhoto() { throw new Error("not used"); }
  async findPhoto() { throw new Error("not used"); }
  async markPhotoUploaded() { throw new Error("not used"); }
  async markPhotoFailed() { throw new Error("not used"); }
  async deletePhoto() { throw new Error("not used"); }
}

class MemoryReconstructionRepository implements ReconstructionRepository {
  status: ThreeDStatus = "not_started";
  latestJob: ReconstructionJob | null = null;
  transitions: ThreeDStatus[] = [];

  async getStatus(targetPropertyId: string): Promise<ThreeDStatusResponse | null> {
    if (targetPropertyId !== propertyId) return null;
    return { propertyId, status: this.status, latestJob: this.latestJob };
  }

  async createQueuedJob(input: { propertyId: string; captureSessionId: string; provider: string }) {
    if (!["not_started", "uploading", "failed"].includes(this.status)) {
      throw new ReconstructionStateConflictError();
    }
    this.status = "queued";
    this.transitions.push("queued");
    this.latestJob = {
      id: jobId,
      propertyId: input.propertyId,
      captureSessionId: input.captureSessionId,
      provider: input.provider,
      providerJobId: null,
      status: "queued",
      errorMessage: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    return this.latestJob;
  }

  async markProcessing() {
    this.status = "processing";
    this.transitions.push("processing");
    return this.updateJob("processing", { startedAt: now });
  }

  async markReviewRequired(_jobId: string, providerJobId: string) {
    this.status = "review_required";
    this.transitions.push("review_required");
    return this.updateJob("review_required", { providerJobId, completedAt: now });
  }

  async markFailed(_jobId: string, errorMessage: string) {
    this.status = "failed";
    this.transitions.push("failed");
    this.updateJob("failed", { errorMessage, completedAt: now });
  }

  async publish() {
    if (this.status !== "review_required") throw new ReconstructionStateConflictError();
    this.status = "ready";
    this.transitions.push("ready");
    const latestJob = this.updateJob("ready", { completedAt: now });
    return { propertyId, status: "ready" as const, latestJob };
  }

  private updateJob(status: ThreeDStatus, changes: Partial<ReconstructionJob>) {
    if (!this.latestJob) throw new ReconstructionStateConflictError();
    this.latestJob = { ...this.latestJob, ...changes, status };
    return this.latestJob;
  }
}

class FailingProvider implements ThreeDReconstructionProvider {
  readonly name = "failing-test";
  async prepare(_input: ThreeDReconstructionInput): Promise<never> {
    throw new Error("fallo simulado");
  }
}

const applications: Awaited<ReturnType<typeof buildApp>>[] = [];
const authorization = { authorization: "Bearer valid-token" };

afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.close()));
});

async function application(
  role: AdminRole,
  photoCount = 1,
  provider: ThreeDReconstructionProvider = new MockThreeDReconstructionProvider(),
  repository = new MemoryReconstructionRepository(),
) {
  const reconstruction = new ThreeDReconstructionService(
    new CaptureStub(capture(photoCount)),
    repository,
    provider,
  );
  const app = await buildApp({
    tokenVerifier: verifier,
    adminProfiles: profiles(role),
    properties,
    reconstruction,
  });
  applications.push(app);
  return { app, repository };
}

describe("3D reconstruction routes", () => {
  it("runs the mock provider through review_required", async () => {
    const { app, repository } = await application("editor");
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/generate-3d`,
      headers: authorization,
      payload: {},
    });

    expect(response.statusCode).toBe(202);
    expect(response.json()).toMatchObject({
      data: { status: "review_required", latestJob: { provider: "mock", status: "review_required" } },
    });
    expect(repository.transitions).toEqual(["queued", "processing", "review_required"]);
  });

  it("requires at least one uploaded photo", async () => {
    const { app } = await application("editor", 0);
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/generate-3d`,
      headers: authorization,
      payload: {},
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "CAPTURE_NOT_READY" });
  });

  it("records provider failures and permits a later retry", async () => {
    const repository = new MemoryReconstructionRepository();
    const failing = await application("editor", 1, new FailingProvider(), repository);
    const failed = await failing.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/generate-3d`,
      headers: authorization,
      payload: {},
    });
    expect(failed.statusCode).toBe(502);
    expect(repository.status).toBe("failed");

    const retry = await application("editor", 1, new MockThreeDReconstructionProvider(), repository);
    const recovered = await retry.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/generate-3d`,
      headers: authorization,
      payload: {},
    });
    expect(recovered.statusCode).toBe(202);
    expect(repository.status).toBe("review_required");
  });

  it("allows only administrators to publish the reviewed result", async () => {
    const repository = new MemoryReconstructionRepository();
    const editor = await application("editor", 1, new MockThreeDReconstructionProvider(), repository);
    await editor.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/generate-3d`,
      headers: authorization,
      payload: {},
    });
    const denied = await editor.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/3d/publish`,
      headers: authorization,
      payload: {},
    });
    expect(denied.statusCode).toBe(403);

    const administrator = await application("admin", 1, new MockThreeDReconstructionProvider(), repository);
    const published = await administrator.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/3d/publish`,
      headers: authorization,
      payload: {},
    });
    expect(published.statusCode).toBe(200);
    expect(published.json()).toMatchObject({ data: { status: "ready" } });
  });
});
