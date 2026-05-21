import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { joinGameSessionSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
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
  const parsed = joinGameSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const found = await adminDb
    .collection("gameSessions")
    .where("sessionCode", "==", parsed.data.sessionCode)
    .limit(1)
    .get();
  if (found.empty) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const sessionDoc = found.docs[0]!;
  const sessionId = sessionDoc.id;
  const data = sessionDoc.data();
  const status = data.status as string;

  if (status === "ended") {
    return NextResponse.json({ error: "Session has ended" }, { status: 409 });
  }

  const players = (data.players as Record<string, unknown>) ?? {};
  if (players[session.uid]) {
    return NextResponse.json({ ok: true, sessionId, alreadyJoined: true });
  }

  // Demos are watch-only, so latecomers can join after the game starts.
  if (status !== "lobby" && data.isDemo !== true) {
    return NextResponse.json(
      { error: "Game already in progress" },
      { status: 409 },
    );
  }

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const userData = userSnap.data() ?? {};
  const displayName = String(userData.displayName ?? session.uid);
  const teamId = (userData.teamId as string | null | undefined) ?? null;

  let teamNameSnapshot: string | null = null;
  if (teamId) {
    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    if (teamSnap.exists) {
      teamNameSnapshot = String(teamSnap.data()?.name ?? "");
    }
  }

  await sessionDoc.ref.update({
    [`players.${session.uid}`]: {
      uid: session.uid,
      displayName,
      joinedAt: FieldValue.serverTimestamp(),
      score: 0,
      teamId,
      teamNameSnapshot,
      answers: {},
    },
  });

  return NextResponse.json({ ok: true, sessionId });
}
