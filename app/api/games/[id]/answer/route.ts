import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { submitAnswerSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

interface QuestionLike {
  correctIndex?: number;
  points?: number;
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!session.emailVerified) {
    return NextResponse.json(
      { error: "Verify your email first" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = submitAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("gameSessions").doc(id);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data() ?? {};
      if (data.status !== "active") throw new Error("NOT_ACTIVE");

      const players = (data.players as Record<string, unknown>) ?? {};
      const me = players[session.uid] as
        | { answers?: Record<string, unknown>; score?: number }
        | undefined;
      if (!me) throw new Error("NOT_A_PLAYER");

      const currentIndex = Number(data.currentQuestionIndex ?? -1);
      if (parsed.data.questionIndex !== currentIndex) {
        throw new Error("WRONG_QUESTION");
      }

      const answers = me.answers ?? {};
      if (answers[String(parsed.data.questionIndex)]) {
        throw new Error("ALREADY_ANSWERED");
      }

      const questions = (data.questions as QuestionLike[] | undefined) ?? [];
      const q = questions[parsed.data.questionIndex];
      if (!q) throw new Error("NO_SUCH_QUESTION");

      const correct = parsed.data.choiceIndex === Number(q.correctIndex ?? -1);
      const points = correct ? Number(q.points ?? 0) : 0;
      const newScore = Number(me.score ?? 0) + points;

      tx.update(ref, {
        [`players.${session.uid}.answers.${parsed.data.questionIndex}`]: {
          choiceIndex: parsed.data.choiceIndex,
          correct,
          points,
          answeredAt: FieldValue.serverTimestamp(),
        },
        [`players.${session.uid}.score`]: newScore,
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Not found"],
      NOT_ACTIVE: [409, "Session not active"],
      NOT_A_PLAYER: [403, "Not a player in this session"],
      WRONG_QUESTION: [409, "That isn't the current question"],
      ALREADY_ANSWERED: [409, "Already answered this question"],
      NO_SUCH_QUESTION: [404, "Question not found"],
    };
    const entry = map[msg];
    if (entry) {
      return NextResponse.json({ error: entry[1] }, { status: entry[0] });
    }
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
