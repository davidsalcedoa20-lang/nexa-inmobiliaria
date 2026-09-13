import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { AuthDependencies } from "./auth/authorize.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerCaptureRoutes, type CaptureRouteDependencies } from "./routes/capture.js";
import { registerPropertyRoutes, type PropertyRouteDependencies } from "./routes/properties.js";
import {
  registerReconstructionRoutes,
  type ReconstructionRouteDependencies,
} from "./routes/reconstruction.js";

export type BuildAppOptions = AuthDependencies & PropertyRouteDependencies &
  Partial<Pick<CaptureRouteDependencies, "captures" | "objectStorage">> & {
  reconstruction?: ReconstructionRouteDependencies["reconstruction"];
  adminOrigins?: string[];
  logger?: boolean | { level: string };
};

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: options.logger ?? false });

  return registerApplication(app, options);
}

export async function registerApplication(app: FastifyInstance, options: BuildAppOptions) {

  await app.register(cors, {
    origin: options.adminOrigins ?? ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  app.addHook("onSend", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "nexa-api",
    stage: 4,
  }));

  await registerAuthRoutes(app, options);
  await registerPropertyRoutes(app, options);
  if (options.captures && options.objectStorage) {
    await registerCaptureRoutes(app, {
      ...options,
      captures: options.captures,
      objectStorage: options.objectStorage,
    });
  }
  if (options.reconstruction) {
    await registerReconstructionRoutes(app, {
      ...options,
      reconstruction: options.reconstruction,
    });
  }

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    void reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "Ocurrió un error inesperado",
    });
  });

  return app;
}
