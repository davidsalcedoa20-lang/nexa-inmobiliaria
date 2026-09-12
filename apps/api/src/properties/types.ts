import type {
  CreatePropertyData,
  Property,
  PropertyListQuery,
  PublicationStatus,
  UpdatePropertyData,
} from "@nexa/contracts";

export type PropertyPage = {
  data: Property[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export interface PropertyRepository {
  list(query: PropertyListQuery): Promise<PropertyPage>;
  findById(id: string): Promise<Property | null>;
  create(input: CreatePropertyData, administratorId: string): Promise<Property>;
  update(id: string, input: UpdatePropertyData, administratorId: string): Promise<Property>;
  changePublicationStatus(
    id: string,
    status: Extract<PublicationStatus, "published" | "unpublished">,
    version: number,
    administratorId: string,
  ): Promise<Property>;
  delete(id: string, version: number): Promise<void>;
}

export class PropertyNotFoundError extends Error {}
export class PropertyVersionConflictError extends Error {}
export class PropertySlugConflictError extends Error {}
