"use client";

import type { CSSProperties, ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type ChoiceRevealState = "idle" | "correct" | "incorrect";

interface AnimatedChoiceProps {
  /** This choice's position in the question. */
  index: number;
  /** The correct answer index, or null while the question is unrevealed. */
  correctIndex: number | null;
  /** Per-choice stagger in ms; correct choice is always staggered last. */
  staggerMs?: number;
  /** Reveal transition duration in ms. */
  durationMs?: number;
  /** Render the choice content with the reveal state and a transition style. */
  children: (args: {
    state: ChoiceRevealState;
    style: CSSProperties;
  }) => ReactNode;
}

/**
 * Computes reveal state + a CSS-transition style for a single choice and
 * hands them to the caller so each site keeps its own markup.
 *
 * - `idle`: question not yet revealed (correctIndex === null)
 * - `correct`: this index is the correct answer
 * - `incorrect`: question revealed and this is not the correct answer
 *
 * The correct choice gets the longest stagger so attention lands on it last.
 * Honors prefers-reduced-motion by zeroing the transition duration.
 */
export function AnimatedChoice({
  index,
  correctIndex,
  staggerMs = 100,
  durationMs = 300,
  children,
}: AnimatedChoiceProps): ReactNode {
  const reducedMotion = useReducedMotion();
  const revealed = correctIndex !== null;
  const state: ChoiceRevealState = !revealed
    ? "idle"
    : index === correctIndex
      ? "correct"
      : "incorrect";

  const delayMs = revealed
    ? state === "correct"
      ? staggerMs * 3
      : staggerMs * index
    : 0;

  const style: CSSProperties = reducedMotion
    ? { transition: "none" }
    : {
        transitionProperty: "background-color, border-color, opacity, transform",
        transitionDuration: `${durationMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        transitionDelay: `${delayMs}ms`,
      };

  return <>{children({ state, style })}</>;
}
