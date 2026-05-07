import { describe, expect, it } from "vitest";
import { aggregateTeams, uniqueTopRealTeam } from "@/lib/games/team-aggregate";

const player = (
  uid: string,
  score: number,
  teamId: string | null,
  teamNameSnapshot: string | null = null,
) => ({
  uid,
  displayName: uid,
  score,
  teamId,
  teamNameSnapshot,
});

describe("aggregateTeams", () => {
  it("groups by teamId and sums scores", () => {
    const players = {
      a: player("a", 5, "t1", "Crew"),
      b: player("b", 3, "t1", "Crew"),
      c: player("c", 4, "t2", "Other"),
    };
    const out = aggregateTeams(players);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ teamId: "t1", score: 8 });
    expect(out[1]).toMatchObject({ teamId: "t2", score: 4 });
  });

  it("buckets free-agent players under Solo with teamId=null", () => {
    const out = aggregateTeams({
      a: player("a", 7, null),
      b: player("b", 2, null),
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      teamId: null,
      teamName: "Solo",
      score: 9,
    });
  });

  it("sorts members within a team by score desc", () => {
    const out = aggregateTeams({
      a: player("a", 1, "t1", "X"),
      b: player("b", 5, "t1", "X"),
    });
    expect(out[0]!.members.map((m) => m.uid)).toEqual(["b", "a"]);
  });

  it("sorts teams by score desc", () => {
    const out = aggregateTeams({
      a: player("a", 1, "t1", "Low"),
      b: player("b", 9, "t2", "High"),
      c: player("c", 5, null),
    });
    expect(out.map((t) => t.teamName)).toEqual(["High", "Solo", "Low"]);
  });
});

describe("uniqueTopRealTeam", () => {
  it("returns the top real team when score > 0 and unique", () => {
    const t = uniqueTopRealTeam([
      { teamId: "t1", teamName: "A", score: 8, members: [] },
      { teamId: "t2", teamName: "B", score: 4, members: [] },
    ]);
    expect(t?.teamId).toBe("t1");
  });

  it("returns null on a tie", () => {
    const t = uniqueTopRealTeam([
      { teamId: "t1", teamName: "A", score: 5, members: [] },
      { teamId: "t2", teamName: "B", score: 5, members: [] },
    ]);
    expect(t).toBeNull();
  });

  it("returns null when only Solo bucket has score", () => {
    const t = uniqueTopRealTeam([
      { teamId: null, teamName: "Solo", score: 10, members: [] },
    ]);
    expect(t).toBeNull();
  });

  it("returns null when all real teams have 0 score", () => {
    const t = uniqueTopRealTeam([
      { teamId: "t1", teamName: "A", score: 0, members: [] },
    ]);
    expect(t).toBeNull();
  });
});
