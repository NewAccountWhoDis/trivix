import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { generateUniqueInviteCode } from "@/lib/teams/invite-code";
import { createTeamSchema } from "@/lib/validation/schemas";
import { DEFAULT_TEAM_STATS } from "@/types/firestore";

export const runtime = "nodejs";

const ERR_ALREADY_ON_TEAM = "ALREADY_ON_TEAM";
const ERR_USER_NOT_FOUND = "USER_NOT_FOUND";

async function isInviteCodeTaken(code: string): Promise<boolean> {
  const snap = await adminDb
    .collection("teams")
    .where("inviteCode", "==", code)
    .limit(1)
    .get();
  return !snap.empty;
}

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

  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const inviteCode = await generateUniqueInviteCode(isInviteCodeTaken);
  const teamRef = adminDb.collection("teams").doc();
  const teamId = teamRef.id;
  const userRef = adminDb.collection("users").doc(session.uid);
  const now = FieldValue.serverTimestamp();

  try {
    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error(ERR_USER_NOT_FOUND);
      const userData = userSnap.data() ?? {};
      if (userData.teamId) throw new Error(ERR_ALREADY_ON_TEAM);

      tx.set(teamRef, {
        teamId,
        name: parsed.data.name,
        inviteCode,
        captainUid: session.uid,
        memberUids: [session.uid],
        createdBy: session.uid,
        stats: DEFAULT_TEAM_STATS,
        createdAt: now,
        updatedAt: now,
      });

      tx.update(userRef, {
        teamId,
        teamHistory: FieldValue.arrayUnion(teamId),
        updatedAt: now,
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_ALREADY_ON_TEAM) {
      return NextResponse.json(
        { error: "You are already on a team" },
        { status: 409 },
      );
    }
    if (msg === ERR_USER_NOT_FOUND) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, teamId, inviteCode });
}
