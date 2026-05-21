import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { finalizeGameSession } from "@/lib/games/finalize";

export const runtime = "nodejs";

interface QuestionLike {
  sectionIndex?: number;
}

/**
 * Advance to the next question. The current question must be revealed and
 * graded first (choice questions are graded automatically on reveal; typed
 * questions require the host to lock scores via /grade).
 *
 * Crossing into a new section first pauses on a break (leaderboard) screen:
 * the first advance at a boundary sets `atBreak`; the next advance ("Start
 * round") clears it and moves to the section's first question. Advancing past
 * the last question finalizes the session.
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
  if (Number(data.revealedIndex ?? -1) < currentIndex) {
    return NextResponse.json(
      { error: "Reveal the answer before continuing" },
      { status: 409 },
    );
  }
  if (Number(data.gradedIndex ?? -1) < currentIndex) {
    return NextResponse.json(
      { error: "Lock the scores for this question first" },
      { status: 409 },
    );
  }

  const questions = (data.questions as QuestionLike[] | undefined) ?? [];
  const total = questions.length;
  const nextIndex = currentIndex + 1;

  if (nextIndex >= total) {
    await ref.update({ currentQuestionIndex: total, atBreak: false });
    await finalizeGameSession(id);
    return NextResponse.json({ ok: true, ended: true });
  }

  const atBreak = data.atBreak === true;
  const crossesSection =
    Number(questions[nextIndex]?.sectionIndex ?? 0) !==
    Number(questions[currentIndex]?.sectionIndex ?? 0);

  // First advance at a section boundary pauses on the break/leaderboard screen.
  if (crossesSection && !atBreak) {
    await ref.update({ atBreak: true });
    return NextResponse.json({ ok: true, break: true });
  }

  await ref.update({ currentQuestionIndex: nextIndex, atBreak: false });
  return NextResponse.json({ ok: true, ended: false });
}
