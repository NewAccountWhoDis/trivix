import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { submitAnswerSchema } from "@/lib/validation/schemas";
import { matchesAccepted } from "@/lib/games/typed";

export const runtime = "nodejs";

interface KeyQuestionLike {
  format?: "choice" | "typed";
  correctIndex?: number;
  points?: number;
  acceptedAnswers?: string[];
}

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
  const parsed = submitAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("gameSessions").doc(id);
  const keysRef = adminDb.collection("gameSessionKeys").doc(id);
  const uid = session.uid;
  const qIndex = parsed.data.questionIndex;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data() ?? {};
      if (data.status !== "active") throw new Error("NOT_ACTIVE");

      const players = (data.players as Record<string, unknown>) ?? {};
      const me = players[uid] as
        | { answers?: Record<string, unknown>; score?: number }
        | undefined;
      if (!me) throw new Error("NOT_A_PLAYER");

      if (qIndex !== Number(data.currentQuestionIndex ?? -1)) {
        throw new Error("WRONG_QUESTION");
      }
      // Answering closes once the host reveals this question.
      if (Number(data.revealedIndex ?? -1) >= qIndex) {
        throw new Error("ANSWERS_CLOSED");
      }
      if ((me.answers ?? {})[String(qIndex)]) {
        throw new Error("ALREADY_ANSWERED");
      }

      const keysSnap = await tx.get(keysRef);
      if (!keysSnap.exists) throw new Error("KEYS_MISSING");
      const key = (keysSnap.data()?.questions as KeyQuestionLike[] | undefined) ?? [];
      const q = key[qIndex];
      if (!q) throw new Error("NO_SUCH_QUESTION");

      if (parsed.data.format === "choice") {
        if (q.format !== "choice") throw new Error("WRONG_FORMAT");
        const correct = parsed.data.choiceIndex === Number(q.correctIndex ?? -1);
        const points = correct ? Number(q.points ?? 0) : 0;
        tx.update(ref, {
          [`players.${uid}.answers.${qIndex}`]: {
            format: "choice",
            choiceIndex: parsed.data.choiceIndex,
            correct,
            points,
            answeredAt: FieldValue.serverTimestamp(),
          },
          [`players.${uid}.score`]: Number(me.score ?? 0) + points,
        });
      } else {
        if (q.format !== "typed") throw new Error("WRONG_FORMAT");
        // Store the typed answers now; scoring is locked when the host grades.
        // We still pre-compute an auto-match correctness for display continuity,
        // but points stay 0 until grading applies them.
        const typed = parsed.data.typedAnswers.filter((a) => a.trim() !== "");
        const accepted = q.acceptedAnswers ?? [];
        const autoCorrect = typed.some((a) => matchesAccepted(a, accepted));
        tx.update(ref, {
          [`players.${uid}.answers.${qIndex}`]: {
            format: "typed",
            typedAnswers: typed,
            correct: autoCorrect,
            points: 0,
            answeredAt: FieldValue.serverTimestamp(),
          },
        });
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Not found"],
      NOT_ACTIVE: [409, "Session not active"],
      NOT_A_PLAYER: [403, "Not a player in this session"],
      WRONG_QUESTION: [409, "That isn't the current question"],
      ANSWERS_CLOSED: [409, "Answers are closed for this question"],
      ALREADY_ANSWERED: [409, "Already answered this question"],
      NO_SUCH_QUESTION: [404, "Question not found"],
      WRONG_FORMAT: [400, "Wrong answer format for this question"],
      KEYS_MISSING: [500, "Answer key missing"],
    };
    const entry = map[msg];
    if (entry) {
      return NextResponse.json({ error: entry[1] }, { status: entry[0] });
    }
    return NextResponse.json({ error: "Submit failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
