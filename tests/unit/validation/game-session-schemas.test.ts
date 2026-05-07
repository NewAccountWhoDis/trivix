import { describe, expect, it } from "vitest";
import {
  createGameSessionSchema,
  joinGameSessionSchema,
  submitAnswerSchema,
} from "@/lib/validation/schemas";

describe("createGameSessionSchema", () => {
  it("requires venueId + questionSetId", () => {
    expect(
      createGameSessionSchema.parse({
        venueId: "v1",
        questionSetId: "qs1",
      }),
    ).toEqual({ venueId: "v1", questionSetId: "qs1" });
  });
  it("rejects missing fields", () => {
    expect(() =>
      createGameSessionSchema.parse({ venueId: "v1" }),
    ).toThrow();
    expect(() => createGameSessionSchema.parse({})).toThrow();
  });
  it("rejects empty strings", () => {
    expect(() =>
      createGameSessionSchema.parse({ venueId: "", questionSetId: "qs1" }),
    ).toThrow();
  });
});

describe("joinGameSessionSchema", () => {
  it("uppercases and validates a 6-char code", () => {
    expect(joinGameSessionSchema.parse({ sessionCode: "abcde2" })).toEqual({
      sessionCode: "ABCDE2",
    });
  });
  it("rejects invalid code", () => {
    expect(() =>
      joinGameSessionSchema.parse({ sessionCode: "BADO0L" }),
    ).toThrow();
  });
});

describe("submitAnswerSchema", () => {
  it("accepts valid indices", () => {
    expect(
      submitAnswerSchema.parse({ questionIndex: 0, choiceIndex: 2 }),
    ).toEqual({ questionIndex: 0, choiceIndex: 2 });
  });
  it("rejects negative questionIndex", () => {
    expect(() =>
      submitAnswerSchema.parse({ questionIndex: -1, choiceIndex: 0 }),
    ).toThrow();
  });
  it("rejects choiceIndex out of 0-3", () => {
    expect(() =>
      submitAnswerSchema.parse({ questionIndex: 0, choiceIndex: 4 }),
    ).toThrow();
    expect(() =>
      submitAnswerSchema.parse({ questionIndex: 0, choiceIndex: -1 }),
    ).toThrow();
  });
  it("rejects non-integer indices", () => {
    expect(() =>
      submitAnswerSchema.parse({ questionIndex: 0.5, choiceIndex: 0 }),
    ).toThrow();
  });
});
