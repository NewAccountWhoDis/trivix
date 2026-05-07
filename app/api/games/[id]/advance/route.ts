import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { QUESTION_DURATION_MS } from "@/lib/games/config";
import { finalizeGameSession } from "@/lib/games/finalize";

export const runtime = "nodejs";

interface QuestionLike {
  correctIndex?: number;
}

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

  const currentIndex = Number(data.currentQuestionIndex ?? 0);
  const sanitizedQuestions =
    (data.questions as Array<Record<string, unknown>> | undefined) ?? [];
  const totalQuestions = sanitizedQuestions.length;
  const nextIndex = currentIndex + 1;

  // Look up the answer key so we can fill in correctIndex on the
  // sanitized session doc for the just-finished question.
  const keysSnap = await keysRef.get();
  const fullQuestions =
    keysSnap.exists
      ? ((keysSnap.data()?.questions as QuestionLike[] | undefined) ?? [])
      : [];
  const revealCorrect = Number(fullQuestions[currentIndex]?.correctIndex ?? 0);

  // Build the updated questions array with the just-finished correctIndex filled in.
  const updatedQuestions = sanitizedQuestions.map((q, i) =>
    i === currentIndex ? { ...q, correctIndex: revealCorrect } : q,
  );

  if (nextIndex >= totalQuestions) {
    await ref.update({
      revealedIndex: currentIndex,
      currentQuestionIndex: totalQuestions,
      currentQuestionDeadline: null,
      questions: updatedQuestions,
    });
    await finalizeGameSession(id);
    return NextResponse.json({ ok: true, ended: true });
  }

  const deadline = Timestamp.fromMillis(Date.now() + QUESTION_DURATION_MS);
  await ref.update({
    revealedIndex: currentIndex,
    currentQuestionIndex: nextIndex,
    currentQuestionDeadline: deadline,
    questions: updatedQuestions,
  });
  return NextResponse.json({ ok: true, ended: false });
}
