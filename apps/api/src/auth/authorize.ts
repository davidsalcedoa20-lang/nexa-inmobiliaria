import type { FastifyReply, FastifyRequest } from "fastify";
import type { AdminProfileRepository, AuthorizedAdmin, TokenVerifier } from "./types.js";
import type { AdminRole } from "@nexa/contracts";

export type AuthDependencies = {
  tokenVerifier: TokenVerifier;
  adminProfiles: AdminProfileRepository;
};

function readBearerToken(request: FastifyRequest) {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export async function authorizeAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  dependencies: AuthDependencies,
): Promise<AuthorizedAdmin | null> {
  const token = readBearerToken(request);

  if (!token) {
    await reply.code(401).send({ code: "AUTH_REQUIRED", message: "Debes iniciar sesión" });
    return null;
  }

  let identity;
  try {
    identity = await dependencies.tokenVerifier.verify(token);
  } catch (error) {
    request.log.warn(
      {
        authError:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : { name: "UnknownAuthError" },
      },
      "Supabase access token verification failed",
    );
    await reply.code(401).send({ code: "INVALID_TOKEN", message: "La sesión no es válida" });
    return null;
  }

  const profile = await dependencies.adminProfiles.findActiveByUserId(identity.userId);
  if (!profile?.isActive) {
    await reply.code(403).send({
      code: "ADMIN_ACCESS_REQUIRED",
      message: "Tu usuario no tiene acceso administrativo activo",
    });
    return null;
  }

  return {
    ...identity,
    displayName: profile.displayName,
    role: profile.role,
  };
}

export async function authorizeRoles(
  request: FastifyRequest,
  reply: FastifyReply,
  dependencies: AuthDependencies,
  roles: AdminRole[],
) {
  const administrator = await authorizeAdmin(request, reply, dependencies);
  if (!administrator) return null;

  if (!roles.includes(administrator.role)) {
    await reply.code(403).send({
      code: "INSUFFICIENT_ROLE",
      message: "Tu rol no permite realizar esta acción",
    });
    return null;
  }

  return administrator;
}
