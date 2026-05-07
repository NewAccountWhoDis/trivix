import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { finalizeGameSession } from "@/lib/games/finalize";

export const runtime = "nodejs";

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
  const totalQuestions = ((data.questions as unknown[] | undefined) ?? [])
    .length;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= totalQuestions) {
    // Reveal the last question, then end + run stats writeback.
    await ref.update({
      revealedIndex: currentIndex,
      currentQuestionIndex: totalQuestions,
    });
    await finalizeGameSession(id);
    return NextResponse.json({ ok: true, ended: true });
  }

  await ref.update({
    revealedIndex: currentIndex,
    currentQuestionIndex: nextIndex,
  });
  return NextResponse.json({ ok: true, ended: false });
}
