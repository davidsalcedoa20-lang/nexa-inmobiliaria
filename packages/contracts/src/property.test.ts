import { describe, expect, it } from "vitest";
import { CreatePropertySchema, UpdatePropertySchema } from "./property.js";

describe("CreatePropertySchema", () => {
  it("accepts each supported property type", () => {
    for (const type of ["house", "lot", "preconstruction"] as const) {
      const result = CreatePropertySchema.safeParse({
        type,
        title: `Propiedad ${type}`,
        slug: `propiedad-${type}`,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.currency).toBe("COP");
        expect(result.data.country).toBe("Colombia");
      }
    }
  });

  it("rejects an unsupported type and unsafe slug", () => {
    const result = CreatePropertySchema.safeParse({
      type: "apartment",
      title: "Propiedad inválida",
      slug: "Propiedad Inválida",
    });

    expect(result.success).toBe(false);
  });

  it("does not inject creation defaults into a partial update", () => {
    const result = UpdatePropertySchema.parse({ title: "Título actualizado", version: 1 });
    expect(result).toEqual({ title: "Título actualizado", version: 1 });
  });
});
