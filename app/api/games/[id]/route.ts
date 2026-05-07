import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export const runtime = "nodejs";

interface QuestionLike {
  prompt?: string;
  choices?: string[];
  correctIndex?: number;
  points?: number;
}

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
  const ref = adminDb.collection("gameSessions").doc(id);
  const snap = await ref.get();
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

  const status = s.status as string;
  const currentQuestionIndex = Number(s.currentQuestionIndex ?? -1);
  const revealedIndex = Number(s.revealedIndex ?? -1);
  const rawQuestions = (s.questions as QuestionLike[] | undefined) ?? [];

  // Sanitize question payload based on role:
  // - host or admin: full questions including correctIndex
  // - player: hide future questions; hide correctIndex on unrevealed
  const questions = rawQuestions.map((q, i) => {
    const showCorrect = isHost || admin || i <= revealedIndex;
    const isFuture = !isHost && !admin && i > currentQuestionIndex;
    if (isFuture) {
      return { hidden: true } as const;
    }
    return {
      prompt: String(q.prompt ?? ""),
      choices: (q.choices as string[]) ?? [],
      points: Number(q.points ?? 0),
      correctIndex: showCorrect ? Number(q.correctIndex ?? 0) : null,
    };
  });

  return NextResponse.json({
    sessionId: id,
    hostUid,
    venueId: String(s.venueId ?? ""),
    venueNameSnapshot: String(s.venueNameSnapshot ?? ""),
    questionSetId: String(s.questionSetId ?? ""),
    questionSetNameSnapshot: String(s.questionSetNameSnapshot ?? ""),
    status,
    currentQuestionIndex,
    revealedIndex,
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
  if (snap.data()?.status !== "lobby") {
    return NextResponse.json(
      { error: "Can only cancel a session in lobby" },
      { status: 409 },
    );
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
