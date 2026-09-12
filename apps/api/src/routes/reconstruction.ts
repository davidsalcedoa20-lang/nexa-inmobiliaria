import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { authorizeRoles, type AuthDependencies } from "../auth/authorize.js";
import type { ReconstructionService } from "../reconstruction/service.js";
import {
  ReconstructionCaptureNotReadyError,
  ReconstructionPropertyNotFoundError,
  ReconstructionProviderError,
  ReconstructionStateConflictError,
} from "../reconstruction/types.js";

const PropertyParamsSchema = z.object({ propertyId: z.uuid() });

export type ReconstructionRouteDependencies = AuthDependencies & {
  reconstruction: ReconstructionService;
};

function reconstructionError(reply: FastifyReply, error: unknown) {
  if (error instanceof ReconstructionPropertyNotFoundError) {
    return reply.code(404).send({ code: "PROPERTY_NOT_FOUND", message: "La propiedad no existe" });
  }
  if (error instanceof ReconstructionCaptureNotReadyError) {
    return reply.code(409).send({
      code: "CAPTURE_NOT_READY",
      message: "Añade al menos una fotografía antes de preparar la generación 3D",
    });
  }
  if (error instanceof ReconstructionStateConflictError) {
    return reply.code(409).send({
      code: "THREE_D_STATE_CONFLICT",
      message: "El estado actual de la experiencia 3D no permite esta acción",
    });
  }
  if (error instanceof ReconstructionProviderError) {
    return reply.code(502).send({
      code: "THREE_D_PROVIDER_FAILED",
      message: "La preparación 3D falló. Puedes intentarlo nuevamente.",
    });
  }
  throw error;
}

export async function registerReconstructionRoutes(
  app: FastifyInstance,
  dependencies: ReconstructionRouteDependencies,
) {
  app.get("/api/v1/properties/:propertyId/3d-status", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ code: "VALIDATION_ERROR", message: "Identificador inválido" });
    }
    try {
      return { data: await dependencies.reconstruction.getStatus(params.data.propertyId) };
    } catch (error) {
      return reconstructionError(reply, error);
    }
  });

  app.post("/api/v1/properties/:propertyId/generate-3d", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ code: "VALIDATION_ERROR", message: "Identificador inválido" });
    }
    try {
      const status = await dependencies.reconstruction.prepare(
        params.data.propertyId,
        administrator.userId,
      );
      return reply.code(202).send({ data: status });
    } catch (error) {
      return reconstructionError(reply, error);
    }
  });

  app.post("/api/v1/properties/:propertyId/3d/publish", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ code: "VALIDATION_ERROR", message: "Identificador inválido" });
    }
    try {
      return {
        data: await dependencies.reconstruction.publish(
          params.data.propertyId,
          administrator.userId,
        ),
      };
    } catch (error) {
      return reconstructionError(reply, error);
    }
  });
}
