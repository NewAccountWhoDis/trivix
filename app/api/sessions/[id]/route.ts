import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export const runtime = "nodejs";

function tsToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

async function isAdminUid(uid: string): Promise<boolean> {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists && Boolean(snap.data()?.isAdmin);
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const snap = await adminDb.collection("gameSessions").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const s = snap.data() ?? {};
  const hostUid = String(s.hostUid ?? "");
  const players = (s.players as Record<string, unknown>) ?? {};
  const isHost = hostUid === session.uid;
  const isPlayer = Boolean(players[session.uid]);
  const admin = !isHost && !isPlayer ? await isAdminUid(session.uid) : false;
  if (!isHost && !isPlayer && !admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentQuestionIndex = Number(s.currentQuestionIndex ?? -1);
  const rawQuestions = (s.questions as Array<Record<string, unknown>>) ?? [];
  // The stored doc is already player-safe (answers null until reveal). For
  // players we additionally hide questions that haven't been reached yet.
  const questions = rawQuestions.map((q, i) => {
    if (!isHost && !admin && i > currentQuestionIndex) {
      return { hidden: true } as const;
    }
    return q;
  });

  return NextResponse.json({
    sessionId: id,
    hostUid,
    venueId: String(s.venueId ?? ""),
    venueNameSnapshot: String(s.venueNameSnapshot ?? ""),
    gameId: String(s.gameId ?? ""),
    gameNameSnapshot: String(s.gameNameSnapshot ?? ""),
    status: String(s.status ?? "lobby"),
    isDemo: s.isDemo === true,
    currentQuestionIndex,
    revealedIndex: Number(s.revealedIndex ?? -1),
    gradedIndex: Number(s.gradedIndex ?? -1),
    atBreak: s.atBreak === true,
    sessionCode: isHost || admin ? String(s.sessionCode ?? "") : null,
    questions,
    players,
    isHost,
    isPlayer,
    createdAt: tsToMs(s.createdAt),
    startedAt: tsToMs(s.startedAt),
    endedAt: tsToMs(s.endedAt),
  });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("gameSessions").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (snap.data()?.hostUid !== session.uid) {
    return NextResponse.json({ error: "Host only" }, { status: 403 });
  }
  // Demos are disposable and can be exited at any point; real sessions can
  // only be cancelled while still in the lobby.
  if (snap.data()?.isDemo !== true && snap.data()?.status !== "lobby") {
    return NextResponse.json(
      { error: "Can only cancel a session in lobby" },
      { status: 409 },
    );
  }

  const batch = adminDb.batch();
  batch.delete(ref);
  batch.delete(adminDb.collection("gameSessionKeys").doc(id));
  await batch.commit();
  return NextResponse.json({ ok: true });
}
