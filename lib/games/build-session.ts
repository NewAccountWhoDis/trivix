import type { GameSection, SectionRevealMode } from "@/types/firestore";

/** Player-safe question on the session doc. Answers hidden until reveal. */
export interface SessionQuestion {
  format: "choice" | "typed";
  theme: string;
  /** 0-based section order; used to show round breaks. */
  sectionIndex: number;
  /** Denormalized from the section so the live UI can gate when to display answers. */
  revealMode: SectionRevealMode;
  prompt: string;
  points: number;
  /** choice: the four options (always visible). */
  choices?: [string, string, string, string];
  /** choice: null until the host reveals. */
  correctIndex?: 0 | 1 | 2 | 3 | null;
  /** typed: number of answer slots to show the player (count only). */
  answerCount?: number;
  /** typed: null until the host reveals. */
  acceptedAnswers?: string[] | null;
}

/** Host/admin-only answer key entry. */
export interface KeyQuestion {
  format: "choice" | "typed";
  points: number;
  choices?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  acceptedAnswers?: string[];
}

export interface BuiltSession {
  sanitized: SessionQuestion[];
  key: KeyQuestion[];
}

/**
 * Flatten a game's sections into the parallel player-safe + answer-key arrays
 * the live session stores. Order follows section order, then question order.
 */
export function buildSessionFromGame(sections: GameSection[]): BuiltSession {
  const sanitized: SessionQuestion[] = [];
  const key: KeyQuestion[] = [];

  sections.forEach((section, sectionIndex) => {
    const revealMode: SectionRevealMode = section.revealMode ?? "per-question";
    for (const q of section.questions) {
      if (q.format === "choice") {
        sanitized.push({
          format: "choice",
          theme: section.theme,
          sectionIndex,
          revealMode,
          prompt: q.prompt,
          points: q.points,
          choices: q.choices,
          correctIndex: null,
        });
        key.push({
          format: "choice",
          points: q.points,
          choices: q.choices,
          correctIndex: q.correctIndex,
        });
      } else {
        const accepted = q.acceptedAnswers ?? [];
        // Scorecard questions carry an explicit slot count and no answer key;
        // quiz typed questions derive their slot count from the accepted list.
        const slots = q.answerCount ?? accepted.length;
        sanitized.push({
          format: "typed",
          theme: section.theme,
          sectionIndex,
          revealMode,
          prompt: q.prompt,
          points: q.points,
          answerCount: slots,
          acceptedAnswers: null,
        });
        key.push({
          format: "typed",
          points: q.points,
          acceptedAnswers: accepted,
        });
      }
    }
  });

  return { sanitized, key };
}

/** Total question count across all sections. */
export function countQuestions(sections: GameSection[]): number {
  return sections.reduce((n, s) => n + s.questions.length, 0);
}
