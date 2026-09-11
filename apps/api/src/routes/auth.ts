import type { FastifyInstance } from "fastify";
import { authorizeAdmin, type AuthDependencies } from "../auth/authorize.js";

export async function registerAuthRoutes(app: FastifyInstance, dependencies: AuthDependencies) {
  app.get("/api/v1/auth/me", async (request, reply) => {
    const admin = await authorizeAdmin(request, reply, dependencies);
    if (!admin) return;

    return {
      data: {
        id: admin.userId,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
      },
    };
  });
}
