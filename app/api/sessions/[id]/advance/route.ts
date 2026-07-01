import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { finalizeGameSession } from "@/lib/games/finalize";

export const runtime = "nodejs";

interface QuestionLike {
  sectionIndex?: number;
  revealMode?: string;
  format?: "choice" | "typed";
  correctIndex?: number | null;
  acceptedAnswers?: string[] | null;
}

interface KeyQuestionLike {
  format?: "choice" | "typed";
  correctIndex?: number;
  acceptedAnswers?: string[];
}

interface PlayerLike {
  score?: number;
  answers?: Record<string, { points?: number } | undefined>;
}

/**
 * For end-of-round sections, /reveal and /grade defer writing answer values to
 * session.questions and defer crediting points to player scores. This helper
 * flushes both at the round break: it patches the session questions with the
 * real answer values from the key, sums each player's staged points across
 * the section, and adds them to the running score.
 */
function buildEndOfRoundRelease(
  questions: QuestionLike[],
  key: KeyQuestionLike[],
  players: Record<string, PlayerLike>,
  sectionIndex: number,
): Record<string, unknown> {
  const indices: number[] = [];
  questions.forEach((q, idx) => {
    if (Number(q.sectionIndex ?? 0) === sectionIndex) indices.push(idx);
  });

  const updatedQuestions = questions.map((q, idx) => {
    if (!indices.includes(idx)) return q;
    const k = key[idx];
    if (k?.format === "typed") {
      return { ...q, acceptedAnswers: k.acceptedAnswers ?? [] };
    }
    return { ...q, correctIndex: Number(k?.correctIndex ?? 0) };
  });

  const updates: Record<string, unknown> = { questions: updatedQuestions };

  for (const [uid, p] of Object.entries(players)) {
    let earned = 0;
    for (const idx of indices) {
      const ans = p.answers?.[String(idx)];
      if (!ans) continue;
      earned += Number(ans.points ?? 0);
    }
    if (earned > 0) {
      updates[`players.${uid}.score`] = Number(p.score ?? 0) + earned;
    }
  }

  return updates;
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
  const atBreak = data.atBreak === true;
  const currentSectionIndex = Number(
    questions[currentIndex]?.sectionIndex ?? 0,
  );
  const currentHeld =
    String(questions[currentIndex]?.revealMode ?? "per-question") ===
    "end-of-round";
  const players = (data.players as Record<string, PlayerLike>) ?? {};

  async function releaseSection(): Promise<Record<string, unknown>> {
    const keysSnap = await keysRef.get();
    const key = keysSnap.exists
      ? ((keysSnap.data()?.questions as KeyQuestionLike[] | undefined) ?? [])
      : [];
    return buildEndOfRoundRelease(
      questions,
      key,
      players,
      currentSectionIndex,
    );
  }

  if (nextIndex >= total) {
    // End of game. For end-of-round, first show a final break with answers +
    // released scores; finalize on the next advance.
    if (currentHeld && !atBreak) {
      const release = await releaseSection();
      await ref.update({ ...release, atBreak: true });
      return NextResponse.json({ ok: true, break: true });
    }
    await ref.update({ currentQuestionIndex: total, atBreak: false });
    await finalizeGameSession(id);
    return NextResponse.json({ ok: true, ended: true });
  }

  const crossesSection =
    Number(questions[nextIndex]?.sectionIndex ?? 0) !== currentSectionIndex;

  // First advance at a section boundary pauses on the break/leaderboard screen.
  if (crossesSection && !atBreak) {
    if (currentHeld) {
      const release = await releaseSection();
      await ref.update({ ...release, atBreak: true });
    } else {
      await ref.update({ atBreak: true });
    }
    return NextResponse.json({ ok: true, break: true });
  }

  await ref.update({ currentQuestionIndex: nextIndex, atBreak: false });
  return NextResponse.json({ ok: true, ended: false });
}
