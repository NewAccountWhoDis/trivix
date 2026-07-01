import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { gradeAnswersSchema } from "@/lib/validation/schemas";
import { normalizeAnswer } from "@/lib/games/typed";
import { isSectionReleased, scoreIsLive } from "@/lib/games/scoring";

export const runtime = "nodejs";

interface KeyQuestionLike {
  format?: "choice" | "typed";
  points?: number;
}

interface PlayerLike {
  score?: number;
  answers?: Record<
    string,
    { format?: string; typedAnswers?: string[]; points?: number } | undefined
  >;
}

/**
 * Lock (or re-lock) scores for a typed question. `approved` is the set of
 * submitted answers the host marked correct (auto-matches pre-checked
 * client-side, host can override). Each player earns the question's points for
 * every distinct approved answer they submitted.
 *
 * Any revealed question can be scored — current or past — up until the game
 * ends, and an already-scored question can be re-scored: each player's total
 * moves by the difference between their new and previously-awarded points.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = gradeAnswersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("gameSessions").doc(id);
  const keysRef = adminDb.collection("gameSessionKeys").doc(id);
  const qIndex = parsed.data.questionIndex;
  const approvedSet = new Set(
    parsed.data.approved.map((a) => normalizeAnswer(a)).filter(Boolean),
  );

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data() ?? {};
      if (data.hostUid !== session.uid) throw new Error("HOST_ONLY");
      if (data.status !== "active") throw new Error("NOT_ACTIVE");
      if (Number(data.revealedIndex ?? -1) < qIndex) throw new Error("NOT_REVEALED");

      const keysSnap = await tx.get(keysRef);
      const key = (keysSnap.data()?.questions as KeyQuestionLike[] | undefined) ?? [];
      const k = key[qIndex];
      if (!k || k.format !== "typed") throw new Error("NOT_TYPED");
      const points = Number(k.points ?? 0);

      // End-of-round sections stage points on the answer but defer crediting
      // player.score until the round-break release in /advance. A question's
      // points are only "live" in player.score once its section has been
      // released — otherwise we edit the staged answer points and let the
      // release (or a later re-score after the break) apply them.
      const sessionQs =
        (data.questions as Array<Record<string, unknown>> | undefined) ?? [];
      const heldMode =
        String(sessionQs[qIndex]?.revealMode ?? "per-question") ===
        "end-of-round";
      const currentIndex = Number(data.currentQuestionIndex ?? -1);
      const atBreak = data.atBreak === true;
      const qSection = Number(sessionQs[qIndex]?.sectionIndex ?? 0);
      const curSection = Number(sessionQs[currentIndex]?.sectionIndex ?? 0);
      const live = scoreIsLive(
        heldMode,
        isSectionReleased(qSection, curSection, atBreak),
      );

      const players = (data.players as Record<string, PlayerLike>) ?? {};
      const updates: Record<string, unknown> = {
        gradedIndex: Math.max(Number(data.gradedIndex ?? -1), qIndex),
      };

      for (const [uid, p] of Object.entries(players)) {
        const ans = p.answers?.[String(qIndex)];
        if (!ans || ans.format !== "typed") continue;
        const distinct = new Set(
          (ans.typedAnswers ?? [])
            .map((a) => normalizeAnswer(a))
            .filter((a) => a && approvedSet.has(a)),
        );
        const matched = distinct.size;
        const earned = matched * points;
        const prevEarned = Number(ans.points ?? 0);
        updates[`players.${uid}.answers.${qIndex}.correct`] = matched > 0;
        updates[`players.${uid}.answers.${qIndex}.points`] = earned;
        // Adjust the running total by the delta so re-scoring is idempotent.
        if (live && earned !== prevEarned) {
          updates[`players.${uid}.score`] =
            Number(p.score ?? 0) + (earned - prevEarned);
        }
      }

      tx.update(ref, updates);
      // Remember what the host approved so the grading toggles can be
      // re-seeded exactly when this question is re-scored later. Host-only doc.
      tx.update(keysRef, {
        [`approvals.${qIndex}`]: Array.from(approvedSet),
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Not found"],
      HOST_ONLY: [403, "Host only"],
      NOT_ACTIVE: [409, "Session not active"],
      NOT_REVEALED: [409, "Reveal the question before grading"],
      NOT_TYPED: [400, "This question isn't a typed question"],
    };
    const entry = map[msg];
    if (entry) {
      return NextResponse.json({ error: entry[1] }, { status: entry[0] });
    }
    return NextResponse.json({ error: "Grade failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
