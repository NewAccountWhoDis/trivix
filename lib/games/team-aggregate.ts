interface PlayerLite {
  uid: string;
  displayName: string;
  score: number;
  teamId: string | null;
  teamNameSnapshot: string | null;
}

export interface TeamAggregate {
  teamId: string | null;
  teamName: string;
  score: number;
  members: Array<{ uid: string; displayName: string; score: number }>;
}

/** Solo bucket key + display name, used when a player has no teamId. */
export const SOLO_TEAM_KEY = "__solo__" as const;

/**
 * Group players by `teamId` and return team aggregates sorted by score desc.
 * Free-agent players (teamId === null) are bucketed under `SOLO_TEAM_KEY`
 * with `teamId: null` and `teamName: "Solo"`.
 */
export function aggregateTeams(
  players: Record<string, PlayerLite | undefined>,
): TeamAggregate[] {
  const groups = new Map<string, TeamAggregate>();
  for (const p of Object.values(players)) {
    if (!p) continue;
    const key = p.teamId ?? SOLO_TEAM_KEY;
    let group = groups.get(key);
    if (!group) {
      group = {
        teamId: p.teamId ?? null,
        teamName: p.teamId ? (p.teamNameSnapshot ?? "Team") : "Solo",
        score: 0,
        members: [],
      };
      groups.set(key, group);
    }
    group.score += p.score;
    group.members.push({
      uid: p.uid,
      displayName: p.displayName,
      score: p.score,
    });
  }
  // Sort each group's members by score desc.
  for (const g of groups.values()) {
    g.members.sort((a, b) => b.score - a.score);
  }
  return Array.from(groups.values()).sort((a, b) => b.score - a.score);
}

/**
 * Determine the unique top-scoring real team. Returns null on ties or when
 * the top scorer is the Solo bucket.
 */
export function uniqueTopRealTeam(
  aggregates: TeamAggregate[],
): TeamAggregate | null {
  const real = aggregates.filter((a) => a.teamId !== null && a.score > 0);
  if (real.length === 0) return null;
  const top = real[0]!.score;
  const tied = real.filter((a) => a.score === top);
  if (tied.length !== 1) return null;
  return tied[0] ?? null;
}

export interface Competitor {
  /** A real team competes as a unit; a free agent competes as themselves. */
  kind: "team" | "solo";
  /** teamId for a team, uid for a solo player. */
  id: string;
  score: number;
}

export type GameWinner =
  | { kind: "team"; id: string }
  | { kind: "solo"; id: string }
  | null;

/**
 * Resolve the single game winner across a mixed field of teams and free
 * agents: the unique competitor with the highest positive score. Ties (or an
 * all-zero field) yield no winner. Team members inherit a team win; a solo
 * player wins on their own score.
 */
export function resolveGameWinner(competitors: Competitor[]): GameWinner {
  const scoring = competitors.filter((c) => c.score > 0);
  if (scoring.length === 0) return null;
  const top = scoring.reduce((m, c) => Math.max(m, c.score), 0);
  const tied = scoring.filter((c) => c.score === top);
  if (tied.length !== 1) return null;
  const w = tied[0]!;
  return { kind: w.kind, id: w.id };
}
