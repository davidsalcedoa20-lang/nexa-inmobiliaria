import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AuthDependencies } from "./auth/authorize.js";
import { registerAuthRoutes } from "./routes/auth.js";

export type BuildAppOptions = AuthDependencies & {
  adminOrigins?: string[];
  logger?: boolean | { level: string };
};

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({ logger: options.logger ?? false });

  await app.register(cors, {
    origin: options.adminOrigins ?? ["http://localhost:5173"],
    credentials: true,
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "nexa-api",
    stage: 1,
  }));

  await registerAuthRoutes(app, options);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    void reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "Ocurrió un error inesperado",
    });
  });

  return app;
}
