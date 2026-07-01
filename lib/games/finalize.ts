import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { aggregateTeams, resolveGameWinner } from "@/lib/games/team-aggregate";
import type { Competitor } from "@/lib/games/team-aggregate";

const TEAM_RECENT_GAMES_CAP = 25;

interface PlayerAggregate {
  uid: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
  teamId: string | null;
}

interface VenueSummary {
  venueId: string;
  venueName: string;
  gamesAttended: number;
  lastVisitedAt: unknown;
}

/** Add one game's attendance to a venues list, in place, returning the copy. */
function bumpVenue(
  venues: VenueSummary[],
  venueId: string,
  venueName: string,
  when: unknown,
): VenueSummary[] {
  if (!venueId) return venues;
  const next = venues.slice();
  const idx = next.findIndex((v) => v.venueId === venueId);
  if (idx >= 0) {
    const cur = next[idx]!;
    next[idx] = {
      ...cur,
      gamesAttended: (cur.gamesAttended ?? 0) + 1,
      lastVisitedAt: when,
    };
  } else {
    next.push({ venueId, venueName, gamesAttended: 1, lastVisitedAt: when });
  }
  return next;
}

/**
 * Mark a game session ended and write per-player stats updates per spec §4.
 * Idempotent — calling twice is a no-op (status check).
 */
export async function finalizeGameSession(sessionId: string): Promise<void> {
  const sessionRef = adminDb.collection("gameSessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) throw new Error("SESSION_NOT_FOUND");
  const session = sessionSnap.data() ?? {};
  if (session.status === "ended") return;

  // Demo sessions never touch real player/team stats — just close them out.
  if (session.isDemo === true) {
    await sessionRef.update({ status: "ended", endedAt: FieldValue.serverTimestamp() });
    await adminDb
      .collection("gameSessionKeys")
      .doc(sessionId)
      .delete()
      .catch(() => {});
    return;
  }

  const players = (session.players as Record<string, unknown>) ?? {};
  const venueId = String(session.venueId ?? "");
  const venueName = String(session.venueNameSnapshot ?? "");
  const now = FieldValue.serverTimestamp();
  const nowMs = new Date();

  const summaries: PlayerAggregate[] = Object.entries(players).map(
    ([uid, raw]) => {
      const p = raw as Record<string, unknown>;
      const answersMap = (p.answers as Record<string, unknown>) ?? {};
      const answersList = Object.values(answersMap) as Array<
        Record<string, unknown>
      >;
      const correctCount = answersList.filter((a) => a.correct === true).length;
      return {
        uid,
        score: Number(p.score ?? 0),
        correctCount,
        totalAnswered: answersList.length,
        teamId: (p.teamId as string | null | undefined) ?? null,
      };
    },
  );

  // One winner across the mixed field of teams and free agents. Team members
  // inherit their team's win; a solo player wins on their own score.
  const teamAggregates = aggregateTeams(
    players as Record<
      string,
      | {
          uid: string;
          displayName: string;
          score: number;
          teamId: string | null;
          teamNameSnapshot: string | null;
        }
      | undefined
    >,
  );
  const realTeams = teamAggregates.filter((t) => t.teamId !== null);
  const competitors: Competitor[] = [
    ...realTeams.map((t) => ({
      kind: "team" as const,
      id: t.teamId!,
      score: t.score,
    })),
    ...summaries
      .filter((s) => s.teamId == null)
      .map((s) => ({ kind: "solo" as const, id: s.uid, score: s.score })),
  ];
  const winner = resolveGameWinner(competitors);

  for (const sum of summaries) {
    const userRef = adminDb.collection("users").doc(sum.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) continue;
    const stats =
      ((userSnap.data() ?? {}).stats as Record<string, unknown>) ?? {};

    const venues = bumpVenue(
      (stats.venues as VenueSummary[] | undefined) ?? [],
      venueId,
      venueName,
      nowMs,
    );

    // Team members inherit their team's result; free agents win on their own.
    const isWinner = sum.teamId
      ? winner?.kind === "team" && winner.id === sum.teamId
      : winner?.kind === "solo" && winner.id === sum.uid;
    const prevCurrentStreak = Number(stats.currentWinStreak ?? 0);
    const newCurrentStreak = isWinner ? prevCurrentStreak + 1 : 0;
    const newLongestStreak = Math.max(
      Number(stats.longestWinStreak ?? 0),
      newCurrentStreak,
    );

    await userRef.update({
      "stats.gamesPlayed": Number(stats.gamesPlayed ?? 0) + 1,
      "stats.gamesWon": Number(stats.gamesWon ?? 0) + (isWinner ? 1 : 0),
      "stats.totalCorrectAnswers":
        Number(stats.totalCorrectAnswers ?? 0) + sum.correctCount,
      "stats.totalQuestionsAnswered":
        Number(stats.totalQuestionsAnswered ?? 0) + sum.totalAnswered,
      "stats.highestScore": Math.max(
        Number(stats.highestScore ?? 0),
        sum.score,
      ),
      "stats.currentWinStreak": newCurrentStreak,
      "stats.longestWinStreak": newLongestStreak,
      "stats.lastPlayedAt": now,
      "stats.venues": venues,
      updatedAt: now,
    });
  }

  // ── Team writeback ── (teamAggregates / realTeams / winner computed above)
  const totalTeams = realTeams.length;

  for (let rank = 0; rank < realTeams.length; rank++) {
    const t = realTeams[rank]!;
    const teamRef = adminDb.collection("teams").doc(t.teamId!);
    const teamSnap = await teamRef.get();
    if (!teamSnap.exists) continue; // disbanded mid-game; skip silently
    const teamData = teamSnap.data() ?? {};
    const teamStats =
      (teamData.stats as Record<string, unknown> | undefined) ?? {};
    const recent = (
      (teamStats.recentGames as unknown[] | undefined) ?? []
    ).slice();

    const summary = {
      sessionId,
      venueNameSnapshot: venueName,
      finalRank: rank + 1,
      totalTeams,
      teamScore: t.score,
      playedAt: nowMs,
    };
    recent.unshift(summary);
    if (recent.length > TEAM_RECENT_GAMES_CAP) {
      recent.length = TEAM_RECENT_GAMES_CAP;
    }

    const teamVenues = bumpVenue(
      (teamStats.venues as VenueSummary[] | undefined) ?? [],
      venueId,
      venueName,
      nowMs,
    );

    const isTeamWinner = winner?.kind === "team" && winner.id === t.teamId;
    await teamRef.update({
      "stats.gamesPlayed": Number(teamStats.gamesPlayed ?? 0) + 1,
      "stats.gamesWon":
        Number(teamStats.gamesWon ?? 0) + (isTeamWinner ? 1 : 0),
      "stats.lastPlayedAt": now,
      "stats.venues": teamVenues,
      "stats.recentGames": recent,
      updatedAt: now,
    });
  }

  await sessionRef.update({
    status: "ended",
    endedAt: now,
  });

  // Drop the answer-key doc — no longer needed once the game is over.
  await adminDb
    .collection("gameSessionKeys")
    .doc(sessionId)
    .delete()
    .catch(() => {
      // Already deleted (e.g., re-finalize) — ignore.
    });
}
