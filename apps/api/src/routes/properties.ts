import {
  CreatePropertySchema,
  PropertyListQuerySchema,
  PropertyVersionSchema,
  UpdatePropertySchema,
} from "@nexa/contracts";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { authorizeRoles, type AuthDependencies } from "../auth/authorize.js";
import {
  PropertyNotFoundError,
  type PropertyRepository,
  PropertySlugConflictError,
  PropertyVersionConflictError,
} from "../properties/types.js";

const PropertyParamsSchema = z.object({ id: z.uuid() });

export type PropertyRouteDependencies = AuthDependencies & {
  properties: PropertyRepository;
};

function validationError(reply: FastifyReply, error: z.ZodError) {
  return reply.code(400).send({
    code: "VALIDATION_ERROR",
    message: "Revisa los datos enviados",
    issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  });
}

function propertyError(reply: FastifyReply, error: unknown) {
  if (error instanceof PropertyNotFoundError) {
    return reply.code(404).send({ code: "PROPERTY_NOT_FOUND", message: "La propiedad no existe" });
  }
  if (error instanceof PropertyVersionConflictError) {
    return reply.code(409).send({
      code: "PROPERTY_VERSION_CONFLICT",
      message: "La propiedad cambió en otra sesión. Recarga la información e inténtalo de nuevo.",
    });
  }
  if (error instanceof PropertySlugConflictError) {
    return reply.code(409).send({
      code: "PROPERTY_SLUG_CONFLICT",
      message: "Ya existe una propiedad con esta URL interna",
    });
  }
  throw error;
}

export async function registerPropertyRoutes(
  app: FastifyInstance,
  dependencies: PropertyRouteDependencies,
) {
  app.get("/api/v1/properties", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const query = PropertyListQuerySchema.safeParse(request.query);
    if (!query.success) return validationError(reply, query.error);
    return dependencies.properties.list(query.data);
  });

  app.get("/api/v1/properties/:id", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    const property = await dependencies.properties.findById(params.data.id);
    if (!property) {
      return reply.code(404).send({ code: "PROPERTY_NOT_FOUND", message: "La propiedad no existe" });
    }
    return { data: property };
  });

  app.post("/api/v1/properties", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const body = CreatePropertySchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error);
    try {
      const property = await dependencies.properties.create(body.data, administrator.userId);
      return reply.code(201).send({ data: property });
    } catch (error) {
      return propertyError(reply, error);
    }
  });

  app.patch("/api/v1/properties/:id", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin", "editor"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    const body = UpdatePropertySchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error);
    try {
      const property = await dependencies.properties.update(
        params.data.id,
        body.data,
        administrator.userId,
      );
      return { data: property };
    } catch (error) {
      return propertyError(reply, error);
    }
  });

  app.post("/api/v1/properties/:id/publish", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    const body = PropertyVersionSchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error);
    try {
      const property = await dependencies.properties.changePublicationStatus(
        params.data.id,
        "published",
        body.data.version,
        administrator.userId,
      );
      return { data: property };
    } catch (error) {
      return propertyError(reply, error);
    }
  });

  app.post("/api/v1/properties/:id/unpublish", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    const body = PropertyVersionSchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error);
    try {
      const property = await dependencies.properties.changePublicationStatus(
        params.data.id,
        "unpublished",
        body.data.version,
        administrator.userId,
      );
      return { data: property };
    } catch (error) {
      return propertyError(reply, error);
    }
  });

  app.delete("/api/v1/properties/:id", async (request, reply) => {
    const administrator = await authorizeRoles(request, reply, dependencies, ["admin"]);
    if (!administrator) return;
    const params = PropertyParamsSchema.safeParse(request.params);
    if (!params.success) return validationError(reply, params.error);
    const body = PropertyVersionSchema.safeParse(request.body);
    if (!body.success) return validationError(reply, body.error);
    try {
      await dependencies.properties.delete(params.data.id, body.data.version);
      return reply.code(204).send();
    } catch (error) {
      return propertyError(reply, error);
    }
  });
}
