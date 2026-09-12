import type {
  AdminRole,
  CreatePropertyData,
  Property,
  PropertyListQuery,
  PublicationStatus,
  UpdatePropertyData,
} from "@nexa/contracts";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../app.js";
import type { AdminProfileRepository, TokenVerifier } from "../auth/types.js";
import {
  PropertyNotFoundError,
  type PropertyPage,
  type PropertyRepository,
  PropertyVersionConflictError,
} from "../properties/types.js";

const administratorId = "78d49554-e1e2-4fd0-b9e2-a728bb8fdd2c";
const propertyId = "231f15f9-877c-464f-ae32-e1b8f7446987";

const verifier: TokenVerifier = {
  async verify(token) {
    if (token !== "valid-token") throw new Error("invalid");
    return { userId: administratorId, email: "admin@nexa.test" };
  },
};

function profileRepository(role: AdminRole): AdminProfileRepository {
  return {
    async findActiveByUserId() {
      return {
        id: administratorId,
        email: "admin@nexa.test",
        displayName: "Administración Nexa",
        role,
        isActive: true,
      };
    },
  };
}

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: propertyId,
    type: "house",
    publicationStatus: "draft",
    threeDStatus: "not_started",
    title: "Casa Mirador",
    slug: "casa-mirador",
    summary: null,
    description: null,
    price: 850_000_000,
    currency: "COP",
    areaSquareMeters: 186,
    bedrooms: 4,
    bathrooms: 3,
    parkingSpaces: 2,
    address: null,
    neighborhood: null,
    city: "Cúcuta",
    department: "Norte de Santander",
    country: "Colombia",
    latitude: null,
    longitude: null,
    specifications: {},
    publishedAt: null,
    version: 1,
    createdAt: "2026-09-11T20:00:00.000Z",
    updatedAt: "2026-09-11T20:00:00.000Z",
    ...overrides,
  };
}

class MemoryPropertyRepository implements PropertyRepository {
  record: Property | null = null;

  async list(query: PropertyListQuery): Promise<PropertyPage> {
    const data = this.record ? [this.record] : [];
    return {
      data,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: data.length,
        totalPages: data.length > 0 ? 1 : 0,
      },
    };
  }

  async findById(id: string) {
    return this.record?.id === id ? this.record : null;
  }

  async create(input: CreatePropertyData) {
    this.record = property({ ...input, publicationStatus: "draft" });
    return this.record;
  }

  async update(id: string, input: UpdatePropertyData) {
    if (!this.record || this.record.id !== id) throw new PropertyNotFoundError();
    if (this.record.version !== input.version) throw new PropertyVersionConflictError();
    const { version: _version, ...changes } = input;
    this.record = property({ ...this.record, ...changes, version: this.record.version + 1 });
    return this.record;
  }

  async changePublicationStatus(
    id: string,
    status: Extract<PublicationStatus, "published" | "unpublished">,
    version: number,
  ) {
    if (!this.record || this.record.id !== id) throw new PropertyNotFoundError();
    if (this.record.version !== version) throw new PropertyVersionConflictError();
    this.record = property({
      ...this.record,
      publicationStatus: status,
      version: version + 1,
      publishedAt: status === "published" ? "2026-09-11T21:00:00.000Z" : this.record.publishedAt,
    });
    return this.record;
  }

  async delete(id: string, version: number) {
    if (!this.record || this.record.id !== id) throw new PropertyNotFoundError();
    if (this.record.version !== version) throw new PropertyVersionConflictError();
    this.record = null;
  }
}

const applications: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(applications.splice(0).map((application) => application.close()));
});

async function application(role: AdminRole, repository = new MemoryPropertyRepository()) {
  const app = await buildApp({
    tokenVerifier: verifier,
    adminProfiles: profileRepository(role),
    properties: repository,
  });
  applications.push(app);
  return { app, repository };
}

const authorization = { authorization: "Bearer valid-token" };

describe("property administration routes", () => {
  it("creates a draft and lists it for an editor", async () => {
    const { app } = await application("editor");
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/properties",
      headers: authorization,
      payload: { type: "house", title: "Casa Mirador", slug: "casa-mirador" },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ data: { publicationStatus: "draft", type: "house" } });

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/properties",
      headers: authorization,
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json()).toMatchObject({ pagination: { total: 1 } });
  });

  it("allows administrators, but not editors, to publish", async () => {
    const repository = new MemoryPropertyRepository();
    repository.record = property();
    const editor = await application("editor", repository);
    const denied = await editor.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/publish`,
      headers: authorization,
      payload: { version: 1 },
    });
    expect(denied.statusCode).toBe(403);

    const admin = await application("admin", repository);
    const published = await admin.app.inject({
      method: "POST",
      url: `/api/v1/properties/${propertyId}/publish`,
      headers: authorization,
      payload: { version: 1 },
    });
    expect(published.statusCode).toBe(200);
    expect(published.json()).toMatchObject({
      data: { publicationStatus: "published", version: 2 },
    });
  });

  it("validates input and detects stale edits", async () => {
    const repository = new MemoryPropertyRepository();
    repository.record = property({ version: 2 });
    const { app } = await application("admin", repository);

    const invalid = await app.inject({
      method: "POST",
      url: "/api/v1/properties",
      headers: authorization,
      payload: { type: "unknown", title: "X", slug: "Unsafe Slug" },
    });
    expect(invalid.statusCode).toBe(400);

    const stale = await app.inject({
      method: "PATCH",
      url: `/api/v1/properties/${propertyId}`,
      headers: authorization,
      payload: { title: "Casa actualizada", version: 1 },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: "PROPERTY_VERSION_CONFLICT" });
  });
});
