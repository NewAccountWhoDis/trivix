import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedHost } from "@/lib/venues/auth";
import { getHostGroup } from "@/lib/host/scope";
import { canUseGame } from "@/lib/games/authz";
import { generateUniqueSessionCode } from "@/lib/games/session-code";
import { buildSessionFromGame, countQuestions } from "@/lib/games/build-session";
import { createGameSessionSchema } from "@/lib/validation/schemas";
import type { GameSection } from "@/types/firestore";

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

  const group = await getHostGroup(auth.uid);

  const venueSnap = await adminDb
    .collection("venues")
    .doc(parsed.data.venueId)
    .get();
  const venueOwner = String(venueSnap.data()?.ownerUid ?? "");
  if (!venueSnap.exists || !group.includes(venueOwner)) {
    return NextResponse.json(
      { error: "Venue not found or not yours" },
      { status: 404 },
    );
  }

  const gameSnap = await adminDb.collection("games").doc(parsed.data.gameId).get();
  if (!gameSnap.exists) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  const gameData = gameSnap.data() ?? {};
  const hostUids = (gameData.hostUids as string[] | undefined) ?? [];
  if (!(await canUseGame(auth.uid, hostUids))) {
    return NextResponse.json(
      { error: "You don't have access to this game" },
      { status: 403 },
    );
  }

  const sections = (gameData.sections as GameSection[] | undefined) ?? [];
  if (countQuestions(sections) === 0) {
    return NextResponse.json(
      { error: "This game has no questions yet" },
      { status: 400 },
    );
  }

  const { sanitized, key } = buildSessionFromGame(sections);

  const sessionCode = await generateUniqueSessionCode();
  const ref = adminDb.collection("gameSessions").doc();
  const sessionId = ref.id;
  const keysRef = adminDb.collection("gameSessionKeys").doc(sessionId);
  const now = FieldValue.serverTimestamp();

  const batch = adminDb.batch();
  batch.set(ref, {
    sessionId,
    hostUid: auth.uid,
    venueId: parsed.data.venueId,
    venueNameSnapshot: String(venueSnap.data()?.name ?? ""),
    gameId: parsed.data.gameId,
    gameNameSnapshot: String(gameData.name ?? ""),
    questions: sanitized,
    status: "lobby",
    currentQuestionIndex: -1,
    revealedIndex: -1,
    gradedIndex: -1,
    atBreak: false,
    sessionCode,
    players: {},
    createdAt: now,
    startedAt: null,
    endedAt: null,
  });
  batch.set(keysRef, {
    sessionId,
    hostUid: auth.uid,
    questions: key,
    createdAt: now,
  });
  await batch.commit();

  return NextResponse.json({ ok: true, sessionId, sessionCode });
}
