import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AuthDependencies } from "./auth/authorize.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerPropertyRoutes, type PropertyRouteDependencies } from "./routes/properties.js";

export type BuildAppOptions = AuthDependencies & PropertyRouteDependencies & {
  adminOrigins?: string[];
  logger?: boolean | { level: string };
};

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, {
    origin: options.adminOrigins ?? ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "nexa-api",
    stage: 2,
  }));

  await registerAuthRoutes(app, options);
  await registerPropertyRoutes(app, options);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    void reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "Ocurrió un error inesperado",
    });
  });

  return app;
}
