import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./application.js";
import type { AdminProfileRepository, TokenVerifier } from "./auth/types.js";
import type { PropertyRepository } from "./properties/types.js";

const verifier: TokenVerifier = {
  async verify(token) {
    if (token !== "valid-token") throw new Error("invalid");
    return { userId: "78d49554-e1e2-4fd0-b9e2-a728bb8fdd2c", email: "admin@nexa.test" };
  },
};

function profiles(active: boolean): AdminProfileRepository {
  return {
    async findActiveByUserId(userId) {
      return {
        id: userId,
        email: "admin@nexa.test",
        displayName: "Administración Nexa",
        role: "admin",
        isActive: active,
      };
    },
  };
}

const applications: Awaited<ReturnType<typeof buildApp>>[] = [];

const propertyRepository: PropertyRepository = {
  async list() {
    return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
  },
  async findById() {
    return null;
  },
  async create() {
    throw new Error("not implemented in auth tests");
  },
  async update() {
    throw new Error("not implemented in auth tests");
  },
  async changePublicationStatus() {
    throw new Error("not implemented in auth tests");
  },
  async delete() {},
};

afterEach(async () => {
  await Promise.all(applications.splice(0).map((app) => app.close()));
});

describe("API stage 4", () => {
  it("allows editing and deleting from the configured admin origin", async () => {
    const origin = "https://nexa-inmobiliaria-admin.vercel.app";
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(true), properties: propertyRepository, adminOrigins: [origin] });
    applications.push(app);
    for (const method of ["PATCH", "DELETE"]) {
      const response = await app.inject({ method: "OPTIONS", url: "/api/v1/properties/example", headers: {
        origin, "access-control-request-method": method, "access-control-request-headers": "authorization,content-type",
      } });
      expect(response.statusCode).toBe(204);
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
      expect(response.headers["access-control-allow-methods"]).toContain(method);
    }
    const denied = await app.inject({ method: "OPTIONS", url: "/api/v1/auth/me", headers: { origin: "https://untrusted.example", "access-control-request-method": "GET" } });
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    const privateResponse = await app.inject({ method: "GET", url: "/api/v1/auth/me", headers: { authorization: "Bearer valid-token" } });
    expect(privateResponse.headers["cache-control"]).toBe("no-store");
  });
  it("reports service health without database access", async () => {
    const app = await buildApp({
      tokenVerifier: verifier,
      adminProfiles: profiles(true),
      properties: propertyRepository,
    });
    applications.push(app);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "nexa-api", stage: 4 });
  });

  it("rejects requests without a session", async () => {
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(true), properties: propertyRepository });
    applications.push(app);
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("returns the active administrator profile", async () => {
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(true), properties: propertyRepository });
    applications.push(app);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: "Bearer valid-token" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { email: "admin@nexa.test", role: "admin" } });
  });

  it("rejects an inactive administrative profile", async () => {
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(false), properties: propertyRepository });
    applications.push(app);
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: "Bearer valid-token" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: "ADMIN_ACCESS_REQUIRED" });
  });
});
