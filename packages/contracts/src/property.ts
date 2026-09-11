import { z } from "zod";

export const propertyTypeValues = ["house", "lot", "preconstruction"] as const;
export const PropertyTypeSchema = z.enum(propertyTypeValues);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const publicationStatusValues = ["draft", "published", "unpublished"] as const;
export const PublicationStatusSchema = z.enum(publicationStatusValues);
export type PublicationStatus = z.infer<typeof PublicationStatusSchema>;

export const currencyValues = ["COP", "USD"] as const;
export const CurrencySchema = z.enum(currencyValues);
export type Currency = z.infer<typeof CurrencySchema>;

const nullableText = (maximum: number) => z.string().trim().max(maximum).nullable().optional();

export const PropertySpecificationsSchema = z.record(z.string(), z.unknown());

export const CreatePropertySchema = z.object({
  type: PropertyTypeSchema,
  title: z.string().trim().min(3).max(180),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug debe usar minúsculas, números y guiones"),
  summary: nullableText(320),
  description: nullableText(10_000),
  price: z.number().nonnegative().nullable().optional(),
  currency: CurrencySchema.default("COP"),
  areaSquareMeters: z.number().positive().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  bathrooms: z.number().nonnegative().nullable().optional(),
  parkingSpaces: z.number().int().nonnegative().nullable().optional(),
  address: nullableText(300),
  neighborhood: nullableText(160),
  city: nullableText(120),
  department: nullableText(120),
  country: z.string().trim().min(2).max(120).default("Colombia"),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  specifications: PropertySpecificationsSchema.default({}),
});

export const UpdatePropertySchema = CreatePropertySchema.partial().extend({
  version: z.number().int().positive(),
});

export const PropertySchema = CreatePropertySchema.extend({
  id: z.uuid(),
  publicationStatus: PublicationStatusSchema,
  publishedAt: z.iso.datetime().nullable(),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type CreatePropertyInput = z.input<typeof CreatePropertySchema>;
export type UpdatePropertyInput = z.input<typeof UpdatePropertySchema>;
export type Property = z.output<typeof PropertySchema>;
