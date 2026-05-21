import { describe, expect, it } from "vitest";
import {
  createGameSessionSchema,
  joinGameSessionSchema,
  submitAnswerSchema,
  gradeAnswersSchema,
} from "@/lib/validation/schemas";

describe("createGameSessionSchema", () => {
  it("requires venueId + gameId", () => {
    expect(
      createGameSessionSchema.parse({ venueId: "v1", gameId: "g1" }),
    ).toEqual({ venueId: "v1", gameId: "g1" });
  });
  it("rejects missing fields", () => {
    expect(() => createGameSessionSchema.parse({ venueId: "v1" })).toThrow();
    expect(() => createGameSessionSchema.parse({})).toThrow();
  });
  it("rejects empty strings", () => {
    expect(() =>
      createGameSessionSchema.parse({ venueId: "", gameId: "g1" }),
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
  it("accepts a choice answer", () => {
    expect(
      submitAnswerSchema.parse({
        questionIndex: 0,
        format: "choice",
        choiceIndex: 2,
      }),
    ).toEqual({ questionIndex: 0, format: "choice", choiceIndex: 2 });
  });
  it("accepts a typed answer", () => {
    expect(
      submitAnswerSchema.parse({
        questionIndex: 1,
        format: "typed",
        typedAnswers: ["ape", "ant"],
      }),
    ).toEqual({
      questionIndex: 1,
      format: "typed",
      typedAnswers: ["ape", "ant"],
    });
  });
  it("rejects choiceIndex out of 0-3", () => {
    expect(() =>
      submitAnswerSchema.parse({
        questionIndex: 0,
        format: "choice",
        choiceIndex: 4,
      }),
    ).toThrow();
  });
  it("rejects an unknown format", () => {
    expect(() =>
      submitAnswerSchema.parse({ questionIndex: 0, format: "essay" }),
    ).toThrow();
  });
  it("rejects an empty typed answer list", () => {
    expect(() =>
      submitAnswerSchema.parse({
        questionIndex: 0,
        format: "typed",
        typedAnswers: [],
      }),
    ).toThrow();
  });
});

describe("gradeAnswersSchema", () => {
  it("accepts a question index and approved list", () => {
    expect(
      gradeAnswersSchema.parse({ questionIndex: 2, approved: ["ape"] }),
    ).toEqual({ questionIndex: 2, approved: ["ape"] });
  });
  it("rejects a negative question index", () => {
    expect(() =>
      gradeAnswersSchema.parse({ questionIndex: -1, approved: [] }),
    ).toThrow();
  });
});
