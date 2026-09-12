import type {
  CreatePropertyData,
  Property,
  PropertyListQuery,
  PublicationStatus,
  UpdatePropertyData,
} from "@nexa/contracts";
import { properties, type Database, type NewPropertyRecord, type PropertyRecord } from "@nexa/database";
import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  PropertyNotFoundError,
  type PropertyPage,
  type PropertyRepository,
  PropertySlugConflictError,
  PropertyVersionConflictError,
} from "./types.js";

function numberOrNull(value: string | null) {
  return value === null ? null : Number(value);
}

function toProperty(record: PropertyRecord): Property {
  return {
    id: record.id,
    type: record.type,
    publicationStatus: record.publicationStatus,
    title: record.title,
    slug: record.slug,
    summary: record.summary,
    description: record.description,
    price: numberOrNull(record.price),
    currency: record.currency,
    areaSquareMeters: numberOrNull(record.areaSquareMeters),
    bedrooms: record.bedrooms,
    bathrooms: numberOrNull(record.bathrooms),
    parkingSpaces: record.parkingSpaces,
    address: record.address,
    neighborhood: record.neighborhood,
    city: record.city,
    department: record.department,
    country: record.country,
    latitude: numberOrNull(record.latitude),
    longitude: numberOrNull(record.longitude),
    specifications: record.specifications,
    publishedAt: record.publishedAt?.toISOString() ?? null,
    version: record.version,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

type PropertyChanges = Partial<
  Omit<NewPropertyRecord, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "version">
>;

function databaseChanges(input: Omit<UpdatePropertyData, "version">): PropertyChanges {
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) changes[key] = value;
  }
  for (const key of ["price", "areaSquareMeters", "bathrooms", "latitude", "longitude"]) {
    const value = changes[key];
    if (typeof value === "number") changes[key] = String(value);
  }
  return changes as PropertyChanges;
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

export class DrizzlePropertyRepository implements PropertyRepository {
  constructor(private readonly database: Database) {}

  async list(query: PropertyListQuery): Promise<PropertyPage> {
    const filters = [];
    if (query.type) filters.push(eq(properties.type, query.type));
    if (query.publicationStatus) {
      filters.push(eq(properties.publicationStatus, query.publicationStatus));
    }
    if (query.search) {
      const pattern = `%${query.search}%`;
      filters.push(
        or(
          ilike(properties.title, pattern),
          ilike(properties.slug, pattern),
          ilike(properties.city, pattern),
          ilike(properties.neighborhood, pattern),
        )!,
      );
    }

    const where = filters.length > 0 ? and(...filters) : undefined;
    const offset = (query.page - 1) * query.pageSize;
    const [records, totals] = await Promise.all([
      this.database
        .select()
        .from(properties)
        .where(where)
        .orderBy(desc(properties.updatedAt), asc(properties.title))
        .limit(query.pageSize)
        .offset(offset),
      this.database.select({ value: count() }).from(properties).where(where),
    ]);
    const total = totals[0]?.value ?? 0;

    return {
      data: records.map(toProperty),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
      },
    };
  }

  async findById(id: string) {
    const [record] = await this.database.select().from(properties).where(eq(properties.id, id)).limit(1);
    return record ? toProperty(record) : null;
  }

  async create(input: CreatePropertyData, administratorId: string) {
    try {
      const [record] = await this.database
        .insert(properties)
        .values({
          type: input.type,
          title: input.title,
          slug: input.slug,
          summary: input.summary ?? null,
          description: input.description ?? null,
          price: input.price == null ? null : String(input.price),
          currency: input.currency,
          areaSquareMeters: input.areaSquareMeters == null ? null : String(input.areaSquareMeters),
          bedrooms: input.bedrooms ?? null,
          bathrooms: input.bathrooms == null ? null : String(input.bathrooms),
          parkingSpaces: input.parkingSpaces ?? null,
          address: input.address ?? null,
          neighborhood: input.neighborhood ?? null,
          city: input.city ?? null,
          department: input.department ?? null,
          country: input.country,
          latitude: input.latitude == null ? null : String(input.latitude),
          longitude: input.longitude == null ? null : String(input.longitude),
          specifications: input.specifications,
          createdBy: administratorId,
          updatedBy: administratorId,
        })
        .returning();
      if (!record) throw new Error("No fue posible crear la propiedad");
      return toProperty(record);
    } catch (error) {
      if (isUniqueViolation(error)) throw new PropertySlugConflictError();
      throw error;
    }
  }

  async update(id: string, input: UpdatePropertyData, administratorId: string) {
    const { version, ...changes } = input;
    try {
      const [record] = await this.database
        .update(properties)
        .set({
          ...databaseChanges(changes),
          updatedBy: administratorId,
          updatedAt: new Date(),
          version: sql`${properties.version} + 1`,
        })
        .where(and(eq(properties.id, id), eq(properties.version, version)))
        .returning();

      if (record) return toProperty(record);
      await this.throwMissingOrConflict(id);
      throw new PropertyVersionConflictError();
    } catch (error) {
      if (isUniqueViolation(error)) throw new PropertySlugConflictError();
      throw error;
    }
  }

  async changePublicationStatus(
    id: string,
    status: Extract<PublicationStatus, "published" | "unpublished">,
    version: number,
    administratorId: string,
  ) {
    const [record] = await this.database
      .update(properties)
      .set({
        publicationStatus: status,
        publishedAt:
          status === "published" ? sql`coalesce(${properties.publishedAt}, now())` : undefined,
        updatedBy: administratorId,
        updatedAt: new Date(),
        version: sql`${properties.version} + 1`,
      })
      .where(and(eq(properties.id, id), eq(properties.version, version)))
      .returning();

    if (record) return toProperty(record);
    await this.throwMissingOrConflict(id);
    throw new PropertyVersionConflictError();
  }

  async delete(id: string, version: number) {
    const deleted = await this.database
      .delete(properties)
      .where(and(eq(properties.id, id), eq(properties.version, version)))
      .returning({ id: properties.id });
    if (deleted.length > 0) return;
    await this.throwMissingOrConflict(id);
    throw new PropertyVersionConflictError();
  }

  private async throwMissingOrConflict(id: string): Promise<void> {
    const [record] = await this.database
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.id, id))
      .limit(1);
    if (!record) throw new PropertyNotFoundError();
  }
}
