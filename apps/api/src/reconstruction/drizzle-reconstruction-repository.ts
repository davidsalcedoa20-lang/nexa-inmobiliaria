import type {
  Database,
  ReconstructionJobRecord,
} from "@nexa/database";
import { properties, reconstructionJobs } from "@nexa/database";
import type { ReconstructionJob, ThreeDStatus, ThreeDStatusResponse } from "@nexa/contracts";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  type ReconstructionRepository,
  ReconstructionPropertyNotFoundError,
  ReconstructionStateConflictError,
} from "./types.js";

function job(record: ReconstructionJobRecord): ReconstructionJob {
  return {
    id: record.id,
    propertyId: record.propertyId,
    captureSessionId: record.captureSessionId,
    provider: record.provider,
    providerJobId: record.providerJobId,
    status: record.status,
    errorMessage: record.errorMessage,
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

const preparableStatuses: ThreeDStatus[] = ["not_started", "uploading", "failed"];

export class DrizzleReconstructionRepository implements ReconstructionRepository {
  constructor(private readonly database: Database) {}

  async getStatus(propertyId: string): Promise<ThreeDStatusResponse | null> {
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

    return {
      propertyId,
      status: property.status,
      latestJob: latest ? job(latest) : null,
    };
  }

  async createQueuedJob(input: {
    propertyId: string;
    captureSessionId: string;
    provider: string;
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
        if (!preparableStatuses.includes(property.status)) {
          throw new ReconstructionStateConflictError();
        }

        const [created] = await transaction
          .insert(reconstructionJobs)
          .values({
            propertyId: input.propertyId,
            captureSessionId: input.captureSessionId,
            provider: input.provider,
            createdBy: input.administratorId,
          })
          .returning();
        if (!created) throw new Error("No fue posible crear el trabajo 3D");

        await transaction
          .update(properties)
          .set({
            threeDStatus: "queued",
            updatedBy: input.administratorId,
            updatedAt: new Date(),
          })
          .where(eq(properties.id, input.propertyId));
        return job(created);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ReconstructionStateConflictError();
      throw error;
    }
  }

  async markProcessing(jobId: string, administratorId: string) {
    return this.transition(jobId, ["queued"], "processing", administratorId, {
      startedAt: new Date(),
      completedAt: null,
      errorMessage: null,
    });
  }

  async markReviewRequired(jobId: string, providerJobId: string, administratorId: string) {
    return this.transition(jobId, ["processing"], "review_required", administratorId, {
      providerJobId,
      completedAt: new Date(),
      errorMessage: null,
    });
  }

  async markFailed(jobId: string, errorMessage: string, administratorId: string) {
    await this.transition(jobId, ["queued", "processing"], "failed", administratorId, {
      errorMessage: errorMessage.slice(0, 1000),
      completedAt: new Date(),
    });
  }

  async publish(propertyId: string, administratorId: string): Promise<ThreeDStatusResponse> {
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
      if (!latest || latest.status !== "review_required") {
        throw new ReconstructionStateConflictError();
      }

      const timestamp = new Date();
      const [updatedJob] = await transaction
        .update(reconstructionJobs)
        .set({ status: "ready", completedAt: timestamp, updatedAt: timestamp })
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

  private async transition(
    jobId: string,
    from: ThreeDStatus[],
    status: Extract<ThreeDStatus, "processing" | "review_required" | "failed">,
    administratorId: string,
    changes: Partial<{
      providerJobId: string;
      errorMessage: string | null;
      startedAt: Date;
      completedAt: Date | null;
    }>,
  ) {
    return this.database.transaction(async (transaction) => {
      const timestamp = new Date();
      const [updated] = await transaction
        .update(reconstructionJobs)
        .set({ ...changes, status, updatedAt: timestamp })
        .where(and(eq(reconstructionJobs.id, jobId), inArray(reconstructionJobs.status, from)))
        .returning();
      if (!updated) throw new ReconstructionStateConflictError();

      await transaction
        .update(properties)
        .set({ threeDStatus: status, updatedBy: administratorId, updatedAt: timestamp })
        .where(eq(properties.id, updated.propertyId));
      return job(updated);
    });
  }
}
