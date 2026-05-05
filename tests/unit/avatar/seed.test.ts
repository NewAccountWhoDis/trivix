import { describe, it, expect } from "vitest";
import { seedToGradient, AVATAR_GRADIENTS } from "@/lib/avatar/seed";

describe("seedToGradient", () => {
  it("returns a known gradient", () => {
    const g = seedToGradient("user-123");
    expect(AVATAR_GRADIENTS).toContainEqual(g);
  });

  it("is deterministic for the same seed", () => {
    expect(seedToGradient("abc")).toEqual(seedToGradient("abc"));
  });

  it("distributes across the gradient set", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(seedToGradient(`user-${i}`).id);
    }
    // 8 gradients; with 200 seeds we should see most of them
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it("handles empty string without throwing", () => {
    expect(() => seedToGradient("")).not.toThrow();
  });
});
