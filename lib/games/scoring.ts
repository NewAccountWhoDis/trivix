/**
 * Pure helpers for when a graded question's points are reflected in a player's
 * running score. Kept separate from the transaction so the rule is testable.
 *
 * Grading can happen for any revealed question — current or past — and the same
 * question can be re-scored. `player.score` is adjusted by the *delta* between a
 * player's newly-earned and previously-awarded points, but only when those
 * points are currently "live" in the score (see below).
 */

/**
 * A held (end-of-round) question defers crediting its points to the round
 * break. Its points are only in `player.score` once its section has been
 * *released* — the game advanced into a later section, or is paused on this
 * section's break (where `/advance` runs the release).
 */
export function isSectionReleased(
  questionSection: number,
  currentSection: number,
  atBreak: boolean,
): boolean {
  return (
    currentSection > questionSection ||
    (currentSection === questionSection && atBreak)
  );
}

/**
 * Whether a question's graded points are currently counted in `player.score`.
 * Per-question-reveal questions (incl. all scorecards) are always live; held
 * ones only after their section is released.
 */
export function scoreIsLive(
  heldMode: boolean,
  sectionReleased: boolean,
): boolean {
  return !heldMode || sectionReleased;
}
