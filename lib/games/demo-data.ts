/**
 * Static content for the host "Demo" experience. A demo spins up a real but
 * `isDemo`-flagged game session seeded with these questions and four make-believe
 * teams whose answers are pre-filled. The host drives the real dashboard
 * (reveal → approve → advance → break → final → winner) without editing anything,
 * and anyone who joins on a phone gets the real player view in watch-only mode.
 *
 * All questions are `typed` so every question surfaces the team answers and the
 * host's "Lock scores" approve step, and so scores accrue round-by-round as the
 * host grades each question (rather than being pre-applied).
 */
import type { SanitizedQuestion, SessionKeyQuestion } from "@/types/firestore";

export const DEMO_GAME_NAME = "Demo";
export const DEMO_VENUE_NAME = "Uranus Bar";
/** Base join code. The API appends a number (TXDEMO2, …) if it's taken. */
export const DEMO_CODE_BASE = "TXDEMO";

/** Player-safe questions stored on the session doc (answers hidden until reveal). */
export const DEMO_QUESTIONS: SanitizedQuestion[] = [
  {
    format: "typed",
    theme: "General Knowledge",
    sectionIndex: 0,
    prompt: "Which planet is known as the Red Planet?",
    points: 2,
    answerCount: 1,
    acceptedAnswers: null,
  },
  {
    format: "typed",
    theme: "General Knowledge",
    sectionIndex: 0,
    prompt: "What is the capital of France?",
    points: 2,
    answerCount: 1,
    acceptedAnswers: null,
  },
  {
    format: "typed",
    theme: "General Knowledge",
    sectionIndex: 0,
    prompt: "How many continents are there on Earth?",
    points: 2,
    answerCount: 1,
    acceptedAnswers: null,
  },
  {
    format: "typed",
    theme: "Final Round",
    sectionIndex: 1,
    prompt: "What is the chemical symbol for gold?",
    points: 3,
    answerCount: 1,
    acceptedAnswers: null,
  },
  {
    format: "typed",
    theme: "Final Round",
    sectionIndex: 1,
    prompt: "In what year did the Titanic sink?",
    points: 3,
    answerCount: 1,
    acceptedAnswers: null,
  },
];

/** Host-only answer key, parallel to DEMO_QUESTIONS by index. */
export const DEMO_KEY: SessionKeyQuestion[] = [
  { format: "typed", points: 2, acceptedAnswers: ["mars"] },
  { format: "typed", points: 2, acceptedAnswers: ["paris"] },
  { format: "typed", points: 2, acceptedAnswers: ["7", "seven"] },
  { format: "typed", points: 3, acceptedAnswers: ["au"] },
  { format: "typed", points: 3, acceptedAnswers: ["1912"] },
];

/** One seeded answer per question index (answeredAt is attached by the API). */
export interface DemoSeedAnswer {
  format: "typed";
  typedAnswers: string[];
}

export interface DemoSeedPlayer {
  uid: string;
  displayName: string;
  teamId: string;
  teamNameSnapshot: string;
  /** Keyed by question index as string. */
  answers: Record<string, DemoSeedAnswer>;
}

const typed = (...answers: string[]): DemoSeedAnswer => ({
  format: "typed",
  typedAnswers: answers,
});

/**
 * Four fake teams with pre-filled answers. Scores accrue as the host grades:
 * Quiz Khalifa 12 (unique winner), Trivia Newton-John 9, Agatha Quiztie 7,
 * Les Quizerables 5.
 */
export const DEMO_PLAYERS: DemoSeedPlayer[] = [
  {
    uid: "demo-team-1",
    displayName: "Quiz Khalifa",
    teamId: "demo-team-1",
    teamNameSnapshot: "Quiz Khalifa",
    answers: {
      "0": typed("Mars"),
      "1": typed("Paris"),
      "2": typed("7"),
      "3": typed("Au"),
      "4": typed("1912"),
    },
  },
  {
    uid: "demo-team-2",
    displayName: "Trivia Newton-John",
    teamId: "demo-team-2",
    teamNameSnapshot: "Trivia Newton-John",
    answers: {
      "0": typed("Mars"),
      "1": typed("Paris"),
      "2": typed("Seven"),
      "3": typed("Gd"),
      "4": typed("1912"),
    },
  },
  {
    uid: "demo-team-3",
    displayName: "Les Quizerables",
    teamId: "demo-team-3",
    teamNameSnapshot: "Les Quizerables",
    answers: {
      "0": typed("Venus"),
      "1": typed("Paris"),
      "2": typed("6"),
      "3": typed("Au"),
      "4": typed("1920"),
    },
  },
  {
    uid: "demo-team-4",
    displayName: "Agatha Quiztie",
    teamId: "demo-team-4",
    teamNameSnapshot: "Agatha Quiztie",
    answers: {
      "0": typed("Mars"),
      "1": typed("London"),
      "2": typed("7"),
      "3": typed("Ag"),
      "4": typed("1912"),
    },
  },
];
