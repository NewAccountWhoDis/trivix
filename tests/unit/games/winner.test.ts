import { describe, expect, it } from "vitest";
import { resolveGameWinner, type Competitor } from "@/lib/games/team-aggregate";

describe("resolveGameWinner", () => {
  it("picks the unique top team", () => {
    const field: Competitor[] = [
      { kind: "team", id: "t1", score: 30 },
      { kind: "team", id: "t2", score: 12 },
    ];
    expect(resolveGameWinner(field)).toEqual({ kind: "team", id: "t1" });
  });

  it("lets a free agent beat teams on raw score", () => {
    const field: Competitor[] = [
      { kind: "team", id: "t1", score: 20 },
      { kind: "solo", id: "u1", score: 25 },
    ];
    expect(resolveGameWinner(field)).toEqual({ kind: "solo", id: "u1" });
  });

  it("returns null on a tie", () => {
    const field: Competitor[] = [
      { kind: "team", id: "t1", score: 20 },
      { kind: "solo", id: "u1", score: 20 },
    ];
    expect(resolveGameWinner(field)).toBeNull();
  });

  it("returns null when nobody scored", () => {
    const field: Competitor[] = [
      { kind: "team", id: "t1", score: 0 },
      { kind: "solo", id: "u1", score: 0 },
    ];
    expect(resolveGameWinner(field)).toBeNull();
  });

  it("returns null for an empty field", () => {
    expect(resolveGameWinner([])).toBeNull();
  });
});
