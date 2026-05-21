import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export const runtime = "nodejs";

interface KeyQuestionLike {
  format?: "choice" | "typed";
  correctIndex?: number;
  acceptedAnswers?: string[];
}

/**
 * Close answering for the current question and reveal its answer. For choice
 * questions scores are already applied (at submit), so the question is also
 * marked graded. Typed questions still need the host to lock scores via /grade.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("gameSessions").doc(id);
  const keysRef = adminDb.collection("gameSessionKeys").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const data = snap.data() ?? {};
  if (data.hostUid !== session.uid) {
    return NextResponse.json({ error: "Host only" }, { status: 403 });
  }
  if (data.status !== "active") {
    return NextResponse.json({ error: "Session not active" }, { status: 409 });
  }

  const i = Number(data.currentQuestionIndex ?? 0);
  if (Number(data.revealedIndex ?? -1) >= i) {
    return NextResponse.json({ ok: true, alreadyRevealed: true });
  }

  const sanitized = (data.questions as Array<Record<string, unknown>>) ?? [];
  const keysSnap = await keysRef.get();
  const key = keysSnap.exists
    ? ((keysSnap.data()?.questions as KeyQuestionLike[] | undefined) ?? [])
    : [];
  const k = key[i];

  const updatedQuestions = sanitized.map((q, idx) => {
    if (idx !== i) return q;
    if (k?.format === "typed") {
      return { ...q, acceptedAnswers: k.acceptedAnswers ?? [] };
    }
    return { ...q, correctIndex: Number(k?.correctIndex ?? 0) };
  });

  const isTyped = k?.format === "typed";
  await ref.update({
    questions: updatedQuestions,
    revealedIndex: i,
    // Choice scores are already locked at submit; typed waits for /grade.
    ...(isTyped ? {} : { gradedIndex: i }),
  });

  return NextResponse.json({ ok: true, needsGrading: isTyped });
}
