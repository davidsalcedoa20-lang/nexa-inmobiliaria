import { describe, expect, it } from "vitest";
import { ThreeDStatusSchema, threeDStatusValues } from "./reconstruction.js";

describe("ThreeDStatusSchema", () => {
  it("accepts every prepared 3D lifecycle status", () => {
    for (const status of threeDStatusValues) {
      expect(ThreeDStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects statuses outside the lifecycle", () => {
    expect(ThreeDStatusSchema.safeParse("published").success).toBe(false);
  });
});
