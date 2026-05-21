import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { gradeAnswersSchema } from "@/lib/validation/schemas";
import { normalizeAnswer } from "@/lib/games/typed";

export const runtime = "nodejs";

interface KeyQuestionLike {
  format?: "choice" | "typed";
  points?: number;
}

interface PlayerLike {
  score?: number;
  answers?: Record<
    string,
    { format?: string; typedAnswers?: string[] } | undefined
  >;
}

/**
 * Lock scores for a typed question. `approved` is the set of submitted answers
 * the host marked correct (auto-matches pre-checked client-side, host can
 * override). Each player earns the question's points for every distinct
 * approved answer they submitted.
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
      if (Number(data.gradedIndex ?? -1) >= qIndex) throw new Error("ALREADY_GRADED");

      const keysSnap = await tx.get(keysRef);
      const key = (keysSnap.data()?.questions as KeyQuestionLike[] | undefined) ?? [];
      const k = key[qIndex];
      if (!k || k.format !== "typed") throw new Error("NOT_TYPED");
      const points = Number(k.points ?? 0);

      const players = (data.players as Record<string, PlayerLike>) ?? {};
      const updates: Record<string, unknown> = { gradedIndex: qIndex };

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
        updates[`players.${uid}.answers.${qIndex}.correct`] = matched > 0;
        updates[`players.${uid}.answers.${qIndex}.points`] = earned;
        updates[`players.${uid}.score`] = Number(p.score ?? 0) + earned;
      }

      tx.update(ref, updates);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Not found"],
      HOST_ONLY: [403, "Host only"],
      NOT_ACTIVE: [409, "Session not active"],
      NOT_REVEALED: [409, "Reveal the question before grading"],
      ALREADY_GRADED: [409, "This question is already graded"],
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
