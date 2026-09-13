import type {
  AdminRole,
  ReconstructionProgressStage,
  ThreeDStatus,
  ThreeDStatusResponse,
} from "@nexa/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../application.js";
import type { AdminProfileRepository, TokenVerifier } from "../auth/types.js";
import type { CaptureRepository, StoredCaptureSession } from "../capture/types.js";
import type { PropertyRepository } from "../properties/types.js";
import { ThreeDReconstructionService } from "../reconstruction/service.js";
import {
  type ReconstructionRepository,
  ReconstructionStateConflictError,
  type StoredReconstructionJob,
} from "../reconstruction/types.js";
import type { ObjectStorageProvider } from "../storage/types.js";

const administratorId = "78d49554-e1e2-4fd0-b9e2-a728bb8fdd2c";
const propertyId = "231f15f9-877c-464f-ae32-e1b8f7446987";
const sessionId = "b25ae061-a2c9-499c-ad91-b208a4c8c58e";
const roomId = "9163ba36-97ac-4c99-b25e-7088050c3437";
const photoId = "9a472099-04f5-4054-8801-ef98ee2f417a";
const jobId = "0152b9c1-81c8-4d6d-a2a4-c5491e6186d6";
const now = "2026-09-12T18:00:00.000Z";
const workerToken = "worker-token-that-is-longer-than-32-characters";

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
    rooms: [{
      id: roomId,
      captureSessionId: sessionId,
      type: "living_room",
      name: "Sala",
      sortOrder: 0,
      photoCount,
      createdAt: now,
      updatedAt: now,
      photos: photoCount === 0 ? [] : [{
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
      }],
    }],
  };
}

class CaptureStub implements CaptureRepository {
  constructor(private readonly snapshot: StoredCaptureSession | null) {}
  async getSnapshot() { return this.snapshot; }
  async getSessionSnapshot(_propertyId: string, targetSessionId: string) {
    return targetSessionId === this.snapshot?.id ? this.snapshot : null;
  }
  async getOrCreateActiveSession() { throw new Error("not used"); }
  async createRoom() { throw new Error("not used"); }
  async deleteRoom() { throw new Error("not used"); }
  async createPendingPhoto() { throw new Error("not used"); }
  async findPhoto() { throw new Error("not used"); }
  async markPhotoUploaded() { throw new Error("not used"); }
  async markPhotoFailed() { throw new Error("not used"); }
  async deletePhoto() { throw new Error("not used"); }
}

const storage: ObjectStorageProvider = {
  async createUploadUrl() { return "https://r2.test/upload"; },
  async createDownloadUrl(key) { return `https://r2.test/${key}`; },
  async headObject(key) {
    return { contentLength: key.endsWith(".glb") ? 4096 : 1024, contentType: null, etag: "etag" };
  },
  async deleteObject() {},
};

class MemoryReconstructionRepository implements ReconstructionRepository {
  status: ThreeDStatus = "not_started";
  latestJob: StoredReconstructionJob | null = null;
  transitions: ThreeDStatus[] = [];

  async getStatus(targetPropertyId: string) {
    if (targetPropertyId !== propertyId) return null;
    return { propertyId, status: this.status, latestJob: this.latestJob };
  }

  async createQueuedJob(input: { propertyId: string; captureSessionId: string; provider: string; sourcePhotoCount: number }) {
    if (["queued", "processing"].includes(this.status)) throw new ReconstructionStateConflictError();
    this.status = "queued";
    this.transitions.push("queued");
    this.latestJob = {
      id: jobId,
      propertyId: input.propertyId,
      captureSessionId: input.captureSessionId,
      provider: input.provider,
      providerJobId: null,
      status: "queued",
      progressPercent: 0,
      progressStage: "queued",
      sourcePhotoCount: input.sourcePhotoCount,
      errorMessage: null,
      attemptCount: 0,
      modelUrl: null,
      modelByteSize: null,
      previewUrl: null,
      startedAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
      modelObjectKey: null,
      previewObjectKey: null,
      workerId: null,
      leaseExpiresAt: null,
      heartbeatAt: null,
    };
    return this.latestJob;
  }

  async claimNext(workerId: string) {
    if (!this.latestJob || !["queued", "processing"].includes(this.status)) return null;
    this.status = "processing";
    this.transitions.push("processing");
    this.latestJob = {
      ...this.latestJob,
      status: "processing",
      progressPercent: 1,
      progressStage: "downloading",
      attemptCount: this.latestJob.attemptCount + 1,
      workerId,
      startedAt: now,
    };
    return this.latestJob;
  }

  async updateProgress(input: { progressPercent: number; progressStage: ReconstructionProgressStage }) {
    if (!this.latestJob) throw new ReconstructionStateConflictError();
    this.latestJob = { ...this.latestJob, ...input };
  }

  async complete(input: { modelObjectKey: string; modelByteSize: number; previewObjectKey: string }) {
    if (!this.latestJob) throw new ReconstructionStateConflictError();
    this.status = "review_required";
    this.transitions.push("review_required");
    this.latestJob = {
      ...this.latestJob,
      ...input,
      status: "review_required",
      progressPercent: 100,
      progressStage: "complete",
      completedAt: now,
    };
  }

  async fail(_jobId: string, _workerId: string, errorMessage: string) {
    if (!this.latestJob) throw new ReconstructionStateConflictError();
    this.status = "failed";
    this.transitions.push("failed");
    this.latestJob = { ...this.latestJob, status: "failed", errorMessage, completedAt: now };
  }

  async publish(): Promise<ThreeDStatusResponse & { latestJob: StoredReconstructionJob }> {
    if (this.status !== "review_required" || !this.latestJob?.modelObjectKey) {
      throw new ReconstructionStateConflictError();
    }
    this.status = "ready";
    this.transitions.push("ready");
    this.latestJob = { ...this.latestJob, status: "ready" };
    return { propertyId, status: "ready", latestJob: this.latestJob };
  }
}

const applications: Awaited<ReturnType<typeof buildApp>>[] = [];
const authorization = { authorization: "Bearer valid-token" };
const workerAuthorization = { authorization: `Bearer ${workerToken}` };

afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.close()));
});

async function application(role: AdminRole, photoCount = 1, repository = new MemoryReconstructionRepository()) {
  const reconstruction = new ThreeDReconstructionService(new CaptureStub(capture(photoCount)), repository, storage);
  const app = await buildApp({
    tokenVerifier: verifier,
    adminProfiles: profiles(role),
    properties,
    reconstruction,
    workerToken,
  });
  applications.push(app);
  return { app, repository };
}

async function queue(app: Awaited<ReturnType<typeof buildApp>>) {
  return app.inject({
    method: "POST",
    url: `/api/v1/properties/${propertyId}/generate-3d`,
    headers: authorization,
    payload: {},
  });
}

describe("3D reconstruction routes", () => {
  it("queues, claims and completes a real worker job", async () => {
    const { app, repository } = await application("editor");
    const queued = await queue(app);
    expect(queued.statusCode).toBe(202);
    expect(queued.json()).toMatchObject({ data: { status: "queued", latestJob: { provider: "local-colmap" } } });

    const claimed = await app.inject({
      method: "POST",
      url: "/api/v1/worker/reconstruction-jobs/claim",
      headers: workerAuthorization,
      payload: { workerId: "test-worker" },
    });
    expect(claimed.statusCode).toBe(200);
    expect(claimed.json()).toMatchObject({ data: { jobId, rooms: [{ photos: [{ id: photoId }] }] } });

    const completed = await app.inject({
      method: "POST",
      url: `/api/v1/worker/reconstruction-jobs/${jobId}/complete`,
      headers: workerAuthorization,
      payload: {
        workerId: "test-worker",
        modelObjectKey: "outputs/model.glb",
        modelByteSize: 4096,
        previewObjectKey: "outputs/preview.png",
      },
    });
    expect(completed.statusCode).toBe(204);
    expect(repository.transitions).toEqual(["queued", "processing", "review_required"]);
  });

  it("requires at least one uploaded photo", async () => {
    const { app } = await application("editor", 0);
    const response = await queue(app);
    expect(response.statusCode).toBe(409);
    expect(response.json()).toMatchObject({ code: "CAPTURE_NOT_READY" });
  });

  it("rejects workers without the internal token", async () => {
    const { app } = await application("editor");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/worker/reconstruction-jobs/claim",
      payload: { workerId: "test-worker" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("allows only administrators to publish a completed result", async () => {
    const repository = new MemoryReconstructionRepository();
    const editor = await application("editor", 1, repository);
    await queue(editor.app);
    await repository.claimNext("test-worker", 180);
    await repository.complete({
      jobId,
      workerId: "test-worker",
      modelObjectKey: "outputs/model.glb",
      modelByteSize: 4096,
      previewObjectKey: "outputs/preview.png",
    });
    const denied = await editor.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/3d/publish`,
      headers: authorization,
      payload: {},
    });
    expect(denied.statusCode).toBe(403);

    const administrator = await application("admin", 1, repository);
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
