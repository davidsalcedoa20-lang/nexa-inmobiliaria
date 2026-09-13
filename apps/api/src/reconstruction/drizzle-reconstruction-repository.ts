import type { Database, ReconstructionJobRecord } from "@nexa/database";
import { properties, reconstructionJobs } from "@nexa/database";
import type { ReconstructionProgressStage, ThreeDStatus } from "@nexa/contracts";
import { and, asc, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import {
  type ReconstructionRepository,
  ReconstructionPropertyNotFoundError,
  ReconstructionStateConflictError,
  type StoredReconstructionJob,
  type StoredThreeDStatusResponse,
} from "./types.js";

function job(record: ReconstructionJobRecord): StoredReconstructionJob {
  return {
    id: record.id,
    propertyId: record.propertyId,
    captureSessionId: record.captureSessionId,
    provider: record.provider,
    providerJobId: record.providerJobId,
    status: record.status,
    progressPercent: record.progressPercent,
    progressStage: record.progressStage as ReconstructionProgressStage,
    sourcePhotoCount: record.sourcePhotoCount,
    errorMessage: record.errorMessage,
    attemptCount: record.attemptCount,
    modelUrl: null,
    modelByteSize: record.modelByteSize,
    previewUrl: null,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    modelObjectKey: record.modelObjectKey,
    previewObjectKey: record.previewObjectKey,
    workerId: record.workerId,
    leaseExpiresAt: record.leaseExpiresAt?.toISOString() ?? null,
    heartbeatAt: record.heartbeatAt?.toISOString() ?? null,
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

const preparableStatuses: ThreeDStatus[] = [
  "not_started",
  "uploading",
  "review_required",
  "ready",
  "failed",
];

export class DrizzleReconstructionRepository implements ReconstructionRepository {
  constructor(private readonly database: Database) {}

  async getStatus(propertyId: string): Promise<StoredThreeDStatusResponse | null> {
    const [property] = await this.database
      .select({ id: properties.id, status: properties.threeDStatus })
      .from(properties)
      .where(eq(properties.id, propertyId))
      .limit(1);
    if (!property) return null;

    const [latest] = await this.database
      .select()
      .from(reconstructionJobs)
      .where(eq(reconstructionJobs.propertyId, propertyId))
      .orderBy(desc(reconstructionJobs.createdAt))
      .limit(1);

    return { propertyId, status: property.status, latestJob: latest ? job(latest) : null };
  }

  async createQueuedJob(input: {
    propertyId: string;
    captureSessionId: string;
    provider: string;
    sourcePhotoCount: number;
    administratorId: string;
  }) {
    try {
      return await this.database.transaction(async (transaction) => {
        const [property] = await transaction
          .select({ status: properties.threeDStatus })
          .from(properties)
          .where(eq(properties.id, input.propertyId))
          .limit(1);
        if (!property) throw new ReconstructionPropertyNotFoundError();
        if (!preparableStatuses.includes(property.status)) throw new ReconstructionStateConflictError();

        const [created] = await transaction
          .insert(reconstructionJobs)
          .values({
            propertyId: input.propertyId,
            captureSessionId: input.captureSessionId,
            provider: input.provider,
            sourcePhotoCount: input.sourcePhotoCount,
            createdBy: input.administratorId,
          })
          .returning();
        if (!created) throw new Error("No fue posible crear el trabajo 3D");

        await transaction
          .update(properties)
          .set({ threeDStatus: "queued", updatedBy: input.administratorId, updatedAt: new Date() })
          .where(eq(properties.id, input.propertyId));
        return job(created);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ReconstructionStateConflictError();
      throw error;
    }
  }

  async claimNext(workerId: string, leaseSeconds: number) {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const [candidate] = await transaction
        .select()
        .from(reconstructionJobs)
        .where(
          or(
            eq(reconstructionJobs.status, "queued"),
            and(
              eq(reconstructionJobs.status, "processing"),
              or(isNull(reconstructionJobs.leaseExpiresAt), lt(reconstructionJobs.leaseExpiresAt, now)),
            ),
          ),
        )
        .orderBy(asc(reconstructionJobs.createdAt))
        .limit(1)
        .for("update", { skipLocked: true });
      if (!candidate) return null;

      const leaseExpiresAt = new Date(now.getTime() + leaseSeconds * 1000);
      const [claimed] = await transaction
        .update(reconstructionJobs)
        .set({
          status: "processing",
          progressPercent: 1,
          progressStage: "downloading",
          workerId,
          providerJobId: candidate.providerJobId ?? candidate.id,
          attemptCount: sql`${reconstructionJobs.attemptCount} + 1`,
          startedAt: candidate.startedAt ?? now,
          completedAt: null,
          heartbeatAt: now,
          leaseExpiresAt,
          errorMessage: null,
          updatedAt: now,
        })
        .where(eq(reconstructionJobs.id, candidate.id))
        .returning();
      if (!claimed) return null;

      await transaction
        .update(properties)
        .set({ threeDStatus: "processing", updatedBy: claimed.createdBy, updatedAt: now })
        .where(eq(properties.id, claimed.propertyId));
      return job(claimed);
    });
  }

  async updateProgress(input: {
    jobId: string;
    workerId: string;
    progressPercent: number;
    progressStage: ReconstructionProgressStage;
    leaseSeconds: number;
  }) {
    const now = new Date();
    const [updated] = await this.database
      .update(reconstructionJobs)
      .set({
        progressPercent: input.progressPercent,
        progressStage: input.progressStage,
        heartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + input.leaseSeconds * 1000),
        updatedAt: now,
      })
      .where(
        and(
          eq(reconstructionJobs.id, input.jobId),
          eq(reconstructionJobs.status, "processing"),
          eq(reconstructionJobs.workerId, input.workerId),
        ),
      )
      .returning({ id: reconstructionJobs.id });
    if (!updated) throw new ReconstructionStateConflictError();
  }

  async complete(input: {
    jobId: string;
    workerId: string;
    modelObjectKey: string;
    modelByteSize: number;
    previewObjectKey: string;
  }) {
    await this.finish(input.jobId, input.workerId, "review_required", {
      progressPercent: 100,
      progressStage: "complete",
      modelObjectKey: input.modelObjectKey,
      modelByteSize: input.modelByteSize,
      previewObjectKey: input.previewObjectKey,
      errorMessage: null,
    });
  }

  async fail(jobId: string, workerId: string, errorMessage: string) {
    await this.finish(jobId, workerId, "failed", {
      errorMessage: errorMessage.slice(0, 1000),
      leaseExpiresAt: null,
    });
  }

  async publish(propertyId: string, administratorId: string): Promise<StoredThreeDStatusResponse> {
    return this.database.transaction(async (transaction) => {
      const [property] = await transaction
        .select({ status: properties.threeDStatus })
        .from(properties)
        .where(eq(properties.id, propertyId))
        .limit(1);
      if (!property) throw new ReconstructionPropertyNotFoundError();
      if (property.status !== "review_required") throw new ReconstructionStateConflictError();

      const [latest] = await transaction
        .select()
        .from(reconstructionJobs)
        .where(eq(reconstructionJobs.propertyId, propertyId))
        .orderBy(desc(reconstructionJobs.createdAt))
        .limit(1);
      if (!latest || latest.status !== "review_required" || !latest.modelObjectKey) {
        throw new ReconstructionStateConflictError();
      }

      const timestamp = new Date();
      const [updatedJob] = await transaction
        .update(reconstructionJobs)
        .set({ status: "ready", updatedAt: timestamp })
        .where(and(eq(reconstructionJobs.id, latest.id), eq(reconstructionJobs.status, "review_required")))
        .returning();
      if (!updatedJob) throw new ReconstructionStateConflictError();

      await transaction
        .update(properties)
        .set({ threeDStatus: "ready", updatedBy: administratorId, updatedAt: timestamp })
        .where(eq(properties.id, propertyId));
      return { propertyId, status: "ready", latestJob: job(updatedJob) };
    });
  }

  private async finish(
    jobId: string,
    workerId: string,
    status: Extract<ThreeDStatus, "review_required" | "failed">,
    changes: Partial<ReconstructionJobRecord>,
  ) {
    return this.database.transaction(async (transaction) => {
      const now = new Date();
      const [updated] = await transaction
        .update(reconstructionJobs)
        .set({ ...changes, status, completedAt: now, heartbeatAt: now, leaseExpiresAt: null, updatedAt: now })
        .where(
          and(
            eq(reconstructionJobs.id, jobId),
            eq(reconstructionJobs.status, "processing"),
            eq(reconstructionJobs.workerId, workerId),
          ),
        )
        .returning();
      if (!updated) throw new ReconstructionStateConflictError();
      await transaction
        .update(properties)
        .set({ threeDStatus: status, updatedBy: updated.createdBy, updatedAt: now })
        .where(eq(properties.id, updated.propertyId));
    });
  }
}
