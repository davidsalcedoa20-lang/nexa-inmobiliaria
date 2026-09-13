import { timingSafeEqual } from "node:crypto";
import {
  WorkerCompleteJobSchema,
  WorkerFailJobSchema,
  WorkerIdentitySchema,
  WorkerProgressUpdateSchema,
} from "@nexa/contracts";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { ReconstructionService } from "../reconstruction/service.js";
import { ReconstructionStateConflictError } from "../reconstruction/types.js";

const JobParamsSchema = z.object({ jobId: z.uuid() });

export type WorkerReconstructionRouteDependencies = {
  reconstruction: ReconstructionService;
  workerToken: string;
};

function authorized(request: FastifyRequest, expectedToken: string) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) return false;
  const received = Buffer.from(header.slice("Bearer ".length), "utf8");
  const expected = Buffer.from(expectedToken, "utf8");
  return received.length === expected.length && timingSafeEqual(received, expected);
}

function requireWorker(request: FastifyRequest, reply: FastifyReply, token: string) {
  if (authorized(request, token)) return true;
  void reply.code(401).send({ code: "WORKER_UNAUTHORIZED", message: "Procesador no autorizado" });
  return false;
}

function conflict(reply: FastifyReply, error: unknown) {
  if (error instanceof ReconstructionStateConflictError) {
    return reply.code(409).send({
      code: "RECONSTRUCTION_JOB_CONFLICT",
      message: "El trabajo ya no pertenece a este procesador o cambió de estado",
    });
  }
  throw error;
}

export async function registerWorkerReconstructionRoutes(
  app: FastifyInstance,
  dependencies: WorkerReconstructionRouteDependencies,
) {
  app.post("/api/v1/worker/reconstruction-jobs/claim", async (request, reply) => {
    if (!requireWorker(request, reply, dependencies.workerToken)) return;
    const body = WorkerIdentitySchema.safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ code: "VALIDATION_ERROR", message: "Procesador inválido" });
    }
    const assignment = await dependencies.reconstruction.claim(body.data.workerId);
    return assignment ? reply.send({ data: assignment }) : reply.code(204).send();
  });

  app.patch("/api/v1/worker/reconstruction-jobs/:jobId/progress", async (request, reply) => {
    if (!requireWorker(request, reply, dependencies.workerToken)) return;
    const params = JobParamsSchema.safeParse(request.params);
    const body = WorkerProgressUpdateSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "VALIDATION_ERROR", message: "Progreso inválido" });
    }
    try {
      await dependencies.reconstruction.progress(params.data.jobId, body.data);
      return reply.code(204).send();
    } catch (error) {
      return conflict(reply, error);
    }
  });

  app.post("/api/v1/worker/reconstruction-jobs/:jobId/complete", async (request, reply) => {
    if (!requireWorker(request, reply, dependencies.workerToken)) return;
    const params = JobParamsSchema.safeParse(request.params);
    const body = WorkerCompleteJobSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "VALIDATION_ERROR", message: "Resultado inválido" });
    }
    try {
      await dependencies.reconstruction.complete(params.data.jobId, body.data);
      return reply.code(204).send();
    } catch (error) {
      return conflict(reply, error);
    }
  });

  app.post("/api/v1/worker/reconstruction-jobs/:jobId/fail", async (request, reply) => {
    if (!requireWorker(request, reply, dependencies.workerToken)) return;
    const params = JobParamsSchema.safeParse(request.params);
    const body = WorkerFailJobSchema.safeParse(request.body);
    if (!params.success || !body.success) {
      return reply.code(400).send({ code: "VALIDATION_ERROR", message: "Error inválido" });
    }
    try {
      await dependencies.reconstruction.fail(params.data.jobId, body.data);
      return reply.code(204).send();
    } catch (error) {
      return conflict(reply, error);
    }
  });
}
