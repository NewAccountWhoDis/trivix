import { describe, expect, it } from "vitest";
import {
  generateInviteCode,
  generateUniqueInviteCode,
} from "@/lib/teams/invite-code";
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  inviteCodeSchema,
} from "@/lib/validation/schemas";

describe("generateInviteCode", () => {
  it("returns a string of the configured length", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
  });

  it("uses only allowed characters across many runs", () => {
    for (let i = 0; i < 1000; i++) {
      const code = generateInviteCode();
      for (const ch of code) {
        expect(INVITE_CODE_ALPHABET).toContain(ch);
      }
    }
  });

  it("produces output that the schema accepts", () => {
    for (let i = 0; i < 100; i++) {
      expect(() => inviteCodeSchema.parse(generateInviteCode())).not.toThrow();
    }
  });

  it("uses the injected RNG deterministically", () => {
    let i = 0;
    const rand = () => i++ % INVITE_CODE_ALPHABET.length;
    const a = generateInviteCode(rand);
    i = 0;
    const b = generateInviteCode(rand);
    expect(a).toBe(b);
    expect(a).toBe(INVITE_CODE_ALPHABET.slice(0, INVITE_CODE_LENGTH));
  });

  it("collisions are rare (smoke check on 10k codes)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) seen.add(generateInviteCode());
    // 10k codes from a 31^6 ≈ 887M space → expect ~zero collisions.
    expect(seen.size).toBeGreaterThan(9_990);
  });
});

describe("generateUniqueInviteCode", () => {
  it("returns the first code that is not taken", async () => {
    const taken = new Set<string>();
    const code = await generateUniqueInviteCode(async (c) => taken.has(c));
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
  });

  it("retries when codes are taken", async () => {
    let attempts = 0;
    const code = await generateUniqueInviteCode(async () => {
      attempts++;
      return attempts < 3;
    });
    expect(attempts).toBe(3);
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
  });

  it("throws after maxAttempts when always taken", async () => {
    await expect(
      generateUniqueInviteCode(async () => true, { maxAttempts: 5 }),
    ).rejects.toThrow(/Failed to generate/);
  });
});
