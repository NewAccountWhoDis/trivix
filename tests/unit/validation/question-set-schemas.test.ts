import { describe, expect, it } from "vitest";
import {
  createQuestionSetSchema,
  questionSchema,
} from "@/lib/validation/schemas";

const VALID_Q = {
  prompt: "What is the capital of New York?",
  choices: ["Albany", "New York City", "Buffalo", "Syracuse"],
  correctIndex: 0,
  points: 1,
};

describe("questionSchema", () => {
  it("accepts a valid question", () => {
    expect(questionSchema.parse(VALID_Q)).toMatchObject(VALID_Q);
  });
  it("rejects prompt under 5 chars", () => {
    expect(() => questionSchema.parse({ ...VALID_Q, prompt: "Q?" })).toThrow();
  });
  it("rejects prompt over 500 chars", () => {
    expect(() =>
      questionSchema.parse({ ...VALID_Q, prompt: "a".repeat(501) }),
    ).toThrow();
  });
  it("requires exactly 4 choices", () => {
    expect(() =>
      questionSchema.parse({ ...VALID_Q, choices: ["A", "B", "C"] }),
    ).toThrow();
    expect(() =>
      questionSchema.parse({ ...VALID_Q, choices: ["A", "B", "C", "D", "E"] }),
    ).toThrow();
  });
  it("rejects empty choice", () => {
    expect(() =>
      questionSchema.parse({ ...VALID_Q, choices: ["", "B", "C", "D"] }),
    ).toThrow();
  });
  it("rejects correctIndex out of range", () => {
    expect(() =>
      questionSchema.parse({ ...VALID_Q, correctIndex: 4 }),
    ).toThrow();
    expect(() =>
      questionSchema.parse({ ...VALID_Q, correctIndex: -1 }),
    ).toThrow();
  });
  it("rejects points out of 1-10", () => {
    expect(() => questionSchema.parse({ ...VALID_Q, points: 0 })).toThrow();
    expect(() => questionSchema.parse({ ...VALID_Q, points: 11 })).toThrow();
    expect(() => questionSchema.parse({ ...VALID_Q, points: 1.5 })).toThrow();
  });
});

describe("createQuestionSetSchema", () => {
  it("accepts a set with 1 question", () => {
    expect(
      createQuestionSetSchema.parse({
        name: "Capitals",
        questions: [VALID_Q],
      }),
    ).toMatchObject({
      name: "Capitals",
      questions: [VALID_Q],
    });
  });
  it("accepts an optional description", () => {
    expect(
      createQuestionSetSchema.parse({
        name: "Capitals",
        description: "US state capitals",
        questions: [VALID_Q],
      }).description,
    ).toBe("US state capitals");
  });
  it("rejects 0 questions", () => {
    expect(() =>
      createQuestionSetSchema.parse({ name: "Empty", questions: [] }),
    ).toThrow();
  });
  it("rejects 51 questions", () => {
    expect(() =>
      createQuestionSetSchema.parse({
        name: "Big",
        questions: Array(51).fill(VALID_Q),
      }),
    ).toThrow();
  });
  it("rejects name under 2 or over 60", () => {
    expect(() =>
      createQuestionSetSchema.parse({ name: "A", questions: [VALID_Q] }),
    ).toThrow();
    expect(() =>
      createQuestionSetSchema.parse({
        name: "x".repeat(61),
        questions: [VALID_Q],
      }),
    ).toThrow();
  });
  it("rejects description over 300", () => {
    expect(() =>
      createQuestionSetSchema.parse({
        name: "X",
        description: "x".repeat(301),
        questions: [VALID_Q],
      }),
    ).toThrow();
  });
});
