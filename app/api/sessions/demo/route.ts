import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedHost } from "@/lib/venues/auth";
import {
  DEMO_CODE_BASE,
  DEMO_GAME_NAME,
  DEMO_KEY,
  DEMO_PLAYERS,
  DEMO_QUESTIONS,
  DEMO_VENUE_NAME,
} from "@/lib/games/demo-data";

export const runtime = "nodejs";

/**
 * Spin up a fresh demo session for the host. The session is real (so phones can
 * join and watch live via the normal Firestore snapshot path) but flagged
 * `isDemo: true`, which keeps it out of real stats on finalize and lets it be
 * torn down at any time.
 *
 * The join code is `TRIVIXDEMO`; if another host already has a live demo on that
 * code, we fall back to `TRIVIXDEMO2`, `TRIVIXDEMO3`, … The caller's own prior
 * demo (if any) is deleted first so a host never accumulates stale demos.
 */
export async function POST(): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const existing = await adminDb
    .collection("gameSessions")
    .where("isDemo", "==", true)
    .get();

  const batch = adminDb.batch();
  const takenCodes = new Set<string>();
  for (const d of existing.docs) {
    const data = d.data();
    if (data.hostUid === auth.uid) {
      // Replace this host's previous demo.
      batch.delete(d.ref);
      batch.delete(adminDb.collection("gameSessionKeys").doc(d.id));
    } else if (data.status !== "ended") {
      takenCodes.add(String(data.sessionCode ?? ""));
    }
  }

  let sessionCode = DEMO_CODE_BASE;
  let suffix = 2;
  while (takenCodes.has(sessionCode)) {
    sessionCode = `${DEMO_CODE_BASE}${suffix}`;
    suffix += 1;
  }

  const ref = adminDb.collection("gameSessions").doc();
  const sessionId = ref.id;
  const keysRef = adminDb.collection("gameSessionKeys").doc(sessionId);
  const now = FieldValue.serverTimestamp();
  const seededAt = Timestamp.now();

  const players: Record<string, unknown> = {};
  for (const p of DEMO_PLAYERS) {
    players[p.uid] = {
      uid: p.uid,
      displayName: p.displayName,
      joinedAt: seededAt,
      score: 0,
      teamId: p.teamId,
      teamNameSnapshot: p.teamNameSnapshot,
      answers: Object.fromEntries(
        Object.entries(p.answers).map(([idx, a]) => [
          idx,
          {
            format: a.format,
            typedAnswers: a.typedAnswers,
            correct: false,
            points: 0,
            answeredAt: seededAt,
          },
        ]),
      ),
    };
  }

  batch.set(ref, {
    sessionId,
    hostUid: auth.uid,
    isDemo: true,
    venueId: "demo",
    venueNameSnapshot: DEMO_VENUE_NAME,
    gameId: "demo",
    gameNameSnapshot: DEMO_GAME_NAME,
    questions: DEMO_QUESTIONS,
    status: "lobby",
    currentQuestionIndex: -1,
    revealedIndex: -1,
    gradedIndex: -1,
    atBreak: false,
    sessionCode,
    players,
    createdAt: now,
    startedAt: null,
    endedAt: null,
  });
  batch.set(keysRef, {
    sessionId,
    hostUid: auth.uid,
    questions: DEMO_KEY,
    createdAt: now,
  });
  await batch.commit();

  return NextResponse.json({ ok: true, sessionId, sessionCode });
}
