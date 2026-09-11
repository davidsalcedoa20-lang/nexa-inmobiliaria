import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app.js";
import type { AdminProfileRepository, TokenVerifier } from "./auth/types.js";

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

afterEach(async () => {
  await Promise.all(applications.splice(0).map((app) => app.close()));
});

describe("API stage 1", () => {
  it("reports service health without database access", async () => {
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(true) });
    applications.push(app);
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: "ok", service: "nexa-api", stage: 1 });
  });

  it("rejects requests without a session", async () => {
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(true) });
    applications.push(app);
    const response = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ code: "AUTH_REQUIRED" });
  });

  it("returns the active administrator profile", async () => {
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(true) });
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
    const app = await buildApp({ tokenVerifier: verifier, adminProfiles: profiles(false) });
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
