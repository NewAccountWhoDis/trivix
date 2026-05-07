import { describe, expect, it } from "vitest";
import {
  createTeamSchema,
  inviteCodeSchema,
  joinTeamSchema,
  requestActionSchema,
  teamNameSchema,
  transferCaptainSchema,
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
} from "@/lib/validation/schemas";

describe("teamNameSchema", () => {
  it("accepts letters, numbers, ampersand, apostrophes, dots, hyphens, spaces", () => {
    expect(teamNameSchema.parse("Joe's Pub")).toBe("Joe's Pub");
    expect(teamNameSchema.parse("Quiz & Co.")).toBe("Quiz & Co.");
    expect(teamNameSchema.parse("Team-99")).toBe("Team-99");
    expect(teamNameSchema.parse("Renée's Crew")).toBe("Renée's Crew");
  });
  it("rejects under 2 chars", () => {
    expect(() => teamNameSchema.parse("A")).toThrow();
  });
  it("rejects over 40 chars", () => {
    expect(() => teamNameSchema.parse("a".repeat(41))).toThrow();
  });
  it("rejects disallowed punctuation", () => {
    expect(() => teamNameSchema.parse("Team!")).toThrow();
    expect(() => teamNameSchema.parse("Team @home")).toThrow();
  });
  it("trims surrounding whitespace", () => {
    expect(teamNameSchema.parse("  My Team  ")).toBe("My Team");
  });
});

describe("inviteCodeSchema", () => {
  it("accepts a valid code and uppercases input", () => {
    expect(inviteCodeSchema.parse("abcde2")).toBe("ABCDE2");
  });
  it("requires exactly 6 characters", () => {
    expect(() => inviteCodeSchema.parse("ABCDE")).toThrow();
    expect(() => inviteCodeSchema.parse("ABCDEFG")).toThrow();
  });
  it("rejects ambiguous characters", () => {
    expect(() => inviteCodeSchema.parse("ABCDE0")).toThrow();
    expect(() => inviteCodeSchema.parse("ABCDE1")).toThrow();
    expect(() => inviteCodeSchema.parse("ABCDEO")).toThrow();
    expect(() => inviteCodeSchema.parse("ABCDEI")).toThrow();
    expect(() => inviteCodeSchema.parse("ABCDEL")).toThrow();
  });
  it("alphabet has 31 chars and excludes ambiguous ones", () => {
    expect(INVITE_CODE_ALPHABET).toHaveLength(31);
    expect(INVITE_CODE_LENGTH).toBe(6);
    for (const ch of "01OIL") {
      expect(INVITE_CODE_ALPHABET).not.toContain(ch);
    }
  });
});

describe("createTeamSchema", () => {
  it("validates name", () => {
    expect(createTeamSchema.parse({ name: "Joe's Pub" })).toEqual({
      name: "Joe's Pub",
    });
  });
  it("rejects missing name", () => {
    expect(() => createTeamSchema.parse({})).toThrow();
  });
});

describe("joinTeamSchema", () => {
  it("validates and uppercases", () => {
    expect(joinTeamSchema.parse({ inviteCode: "abcde2" })).toEqual({
      inviteCode: "ABCDE2",
    });
  });
  it("rejects bad code", () => {
    expect(() => joinTeamSchema.parse({ inviteCode: "ABCDE0" })).toThrow();
  });
});

describe("transferCaptainSchema", () => {
  it("requires non-empty uid", () => {
    expect(transferCaptainSchema.parse({ uid: "abc" })).toEqual({ uid: "abc" });
    expect(() => transferCaptainSchema.parse({ uid: "" })).toThrow();
    expect(() => transferCaptainSchema.parse({})).toThrow();
  });
});

describe("requestActionSchema", () => {
  it("accepts approve and deny", () => {
    expect(requestActionSchema.parse({ action: "approve" })).toEqual({
      action: "approve",
    });
    expect(requestActionSchema.parse({ action: "deny" })).toEqual({
      action: "deny",
    });
  });
  it("rejects other actions", () => {
    expect(() => requestActionSchema.parse({ action: "ban" })).toThrow();
  });
});
