import { describe, expect, it } from "vitest";
import { isSectionReleased, scoreIsLive } from "@/lib/games/scoring";

describe("isSectionReleased", () => {
  it("is released once the game has advanced into a later section", () => {
    expect(isSectionReleased(0, 1, false)).toBe(true);
  });
  it("is released while paused on that section's own round break", () => {
    expect(isSectionReleased(1, 1, true)).toBe(true);
  });
  it("is not released mid-section before the break", () => {
    expect(isSectionReleased(1, 1, false)).toBe(false);
  });
  it("is not released for a section still ahead", () => {
    expect(isSectionReleased(2, 1, false)).toBe(false);
  });
});

describe("scoreIsLive", () => {
  it("per-question reveal (incl. scorecards) is always live", () => {
    expect(scoreIsLive(false, false)).toBe(true);
    expect(scoreIsLive(false, true)).toBe(true);
  });
  it("held (end-of-round) questions are live only after release", () => {
    expect(scoreIsLive(true, false)).toBe(false);
    expect(scoreIsLive(true, true)).toBe(true);
  });
});

// Documents the delta the grade route applies to player.score. Points only
// move when they're live; re-scoring shifts the total by (new - previous).
function scoreDelta(
  live: boolean,
  prevEarned: number,
  earned: number,
): number {
  return live && earned !== prevEarned ? earned - prevEarned : 0;
}

describe("grade score delta", () => {
  it("first grade of a live question adds the full amount", () => {
    expect(scoreDelta(true, 0, 6)).toBe(6);
  });
  it("re-grading a live question shifts by the difference", () => {
    expect(scoreDelta(true, 6, 4)).toBe(-2);
    expect(scoreDelta(true, 2, 5)).toBe(3);
  });
  it("re-grading to the same amount is a no-op", () => {
    expect(scoreDelta(true, 4, 4)).toBe(0);
  });
  it("grading a not-yet-live (held, unreleased) question never touches score", () => {
    expect(scoreDelta(false, 0, 6)).toBe(0);
    expect(scoreDelta(false, 3, 6)).toBe(0);
  });
});
