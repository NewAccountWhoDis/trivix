import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedHost } from "@/lib/venues/auth";
import { generateUniqueSessionCode } from "@/lib/games/session-code";
import { createGameSessionSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createGameSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const venueSnap = await adminDb
    .collection("venues")
    .doc(parsed.data.venueId)
    .get();
  if (!venueSnap.exists || venueSnap.data()?.ownerUid !== auth.uid) {
    return NextResponse.json(
      { error: "Venue not found or not yours" },
      { status: 404 },
    );
  }

  const setSnap = await adminDb
    .collection("questionSets")
    .doc(parsed.data.questionSetId)
    .get();
  if (!setSnap.exists || setSnap.data()?.ownerUid !== auth.uid) {
    return NextResponse.json(
      { error: "Question set not found or not yours" },
      { status: 404 },
    );
  }
  const questions = (setSnap.data()?.questions as unknown[] | undefined) ?? [];
  if (questions.length === 0) {
    return NextResponse.json(
      { error: "Question set has no questions" },
      { status: 400 },
    );
  }

  const sessionCode = await generateUniqueSessionCode();
  const ref = adminDb.collection("gameSessions").doc();
  const sessionId = ref.id;
  const keysRef = adminDb.collection("gameSessionKeys").doc(sessionId);
  const now = FieldValue.serverTimestamp();

  // Strip correctIndex from the player-safe session doc — fill back in
  // per question only when the host advances past it.
  const sanitizedQuestions = (questions as Array<Record<string, unknown>>).map(
    (q) => ({
      prompt: q.prompt,
      choices: q.choices,
      points: q.points,
      correctIndex: null,
    }),
  );

  const batch = adminDb.batch();
  batch.set(ref, {
    sessionId,
    hostUid: auth.uid,
    venueId: parsed.data.venueId,
    venueNameSnapshot: String(venueSnap.data()?.name ?? ""),
    questionSetId: parsed.data.questionSetId,
    questionSetNameSnapshot: String(setSnap.data()?.name ?? ""),
    questions: sanitizedQuestions,
    status: "lobby",
    currentQuestionIndex: -1,
    revealedIndex: -1,
    sessionCode,
    players: {},
    currentQuestionDeadline: null,
    createdAt: now,
    startedAt: null,
    endedAt: null,
  });
  batch.set(keysRef, {
    sessionId,
    hostUid: auth.uid,
    questions,
    createdAt: now,
  });
  await batch.commit();

  return NextResponse.json({ ok: true, sessionId, sessionCode });
}
