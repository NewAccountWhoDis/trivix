import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

interface PlayerAggregate {
  uid: string;
  score: number;
  correctCount: number;
  totalAnswered: number;
}

interface VenueSummary {
  venueId: string;
  venueName: string;
  gamesAttended: number;
  lastVisitedAt: unknown;
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
      };
    },
  );

  // Unique top scorer wins; ties → no winner.
  const maxScore = summaries.reduce((m, s) => (s.score > m ? s.score : m), 0);
  const top = summaries.filter((s) => s.score === maxScore && maxScore > 0);
  const winnerUid = top.length === 1 ? top[0]!.uid : null;

  for (const sum of summaries) {
    const userRef = adminDb.collection("users").doc(sum.uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) continue;
    const stats =
      ((userSnap.data() ?? {}).stats as Record<string, unknown>) ?? {};

    const venues = ((stats.venues as VenueSummary[] | undefined) ?? []).slice();
    if (venueId) {
      const existingIdx = venues.findIndex((v) => v.venueId === venueId);
      if (existingIdx >= 0) {
        const cur = venues[existingIdx]!;
        venues[existingIdx] = {
          ...cur,
          gamesAttended: (cur.gamesAttended ?? 0) + 1,
          lastVisitedAt: nowMs,
        };
      } else {
        venues.push({
          venueId,
          venueName,
          gamesAttended: 1,
          lastVisitedAt: nowMs,
        });
      }
    }

    const isWinner = sum.uid === winnerUid;
    const prevCurrentStreak = Number(stats.currentWinStreak ?? 0);
    const newCurrentStreak = isWinner ? prevCurrentStreak + 1 : 0;
    const newLongestStreak = Math.max(
      Number(stats.longestWinStreak ?? 0),
      newCurrentStreak,
    );

    await userRef.update({
      "stats.gamesPlayed": Number(stats.gamesPlayed ?? 0) + 1,
      "stats.gamesWon":
        Number(stats.gamesWon ?? 0) + (isWinner ? 1 : 0),
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

  await sessionRef.update({ status: "ended", endedAt: now });
}
