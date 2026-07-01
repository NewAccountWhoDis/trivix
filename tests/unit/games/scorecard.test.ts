import { describe, expect, it } from "vitest";
import {
  createGameSchema,
  scorecardSectionSchema,
  updateGameSchema,
} from "@/lib/validation/schemas";
import { buildSessionFromGame, countQuestions } from "@/lib/games/build-session";
import type { GameSection } from "@/types/firestore";

const scorecardRound: GameSection = {
  id: "r1",
  theme: "Round 1",
  questions: [
    { id: "q1", format: "typed", prompt: "Question 1", points: 2, answerCount: 3 },
    { id: "q2", format: "typed", prompt: "Question 2", points: 1, answerCount: 1 },
  ],
};

describe("createGameSchema kind", () => {
  it("defaults to no kind when omitted (treated as quiz downstream)", () => {
    const parsed = createGameSchema.parse({ name: "Friday Trivia" });
    expect(parsed.kind).toBeUndefined();
  });
  it("accepts an explicit scorecard kind", () => {
    expect(createGameSchema.parse({ name: "Bar Night", kind: "scorecard" }).kind).toBe(
      "scorecard",
    );
  });
  it("rejects an unknown kind", () => {
    expect(() => createGameSchema.parse({ name: "Bar Night", kind: "bingo" })).toThrow();
  });
});

describe("scorecardSectionSchema", () => {
  it("accepts a round with answer slots and points", () => {
    expect(scorecardSectionSchema.parse(scorecardRound).questions).toHaveLength(2);
  });
  it("requires answerCount on each question", () => {
    expect(() =>
      scorecardSectionSchema.parse({
        id: "r1",
        theme: "Round 1",
        questions: [{ id: "q1", format: "typed", prompt: "Question 1", points: 1 }],
      }),
    ).toThrow();
  });
  it("rejects an empty round", () => {
    expect(() =>
      scorecardSectionSchema.parse({ id: "r1", theme: "Round 1", questions: [] }),
    ).toThrow();
  });
});

describe("updateGameSchema accepts both shapes", () => {
  it("validates scorecard rounds via the section union", () => {
    const parsed = updateGameSchema.parse({
      name: "Bar Night",
      kind: "scorecard",
      sections: [scorecardRound],
    });
    expect(parsed.sections).toHaveLength(1);
  });
  it("still validates a quiz section", () => {
    const parsed = updateGameSchema.parse({
      name: "Friday Trivia",
      sections: [
        {
          id: "s1",
          theme: "80s Movies",
          questions: [
            {
              id: "q1",
              format: "choice",
              prompt: "What year did Top Gun release?",
              points: 1,
              choices: ["1984", "1985", "1986", "1987"],
              correctIndex: 2,
            },
          ],
        },
      ],
    });
    expect(parsed.sections).toHaveLength(1);
  });
});

describe("buildSessionFromGame for scorecard rounds", () => {
  it("uses the explicit answer-slot count and an empty key", () => {
    const { sanitized, key } = buildSessionFromGame([scorecardRound]);
    expect(sanitized).toHaveLength(2);
    expect(sanitized[0]).toMatchObject({
      format: "typed",
      answerCount: 3,
      points: 2,
      acceptedAnswers: null,
    });
    // No answer key — the host grades manually at play time.
    expect(key[0]).toMatchObject({ format: "typed", points: 2, acceptedAnswers: [] });
  });
  it("counts each scorecard question", () => {
    expect(countQuestions([scorecardRound])).toBe(2);
  });
});
