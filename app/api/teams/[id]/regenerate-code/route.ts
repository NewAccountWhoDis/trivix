import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { isCaptain, loadTeam } from "@/lib/teams/auth";
import { generateUniqueInviteCode } from "@/lib/teams/invite-code";

export const runtime = "nodejs";

async function isInviteCodeTaken(code: string): Promise<boolean> {
  const snap = await adminDb
    .collection("teams")
    .where("inviteCode", "==", code)
    .limit(1)
    .get();
  return !snap.empty;
}

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { uid } = session;

  const { id } = await ctx.params;
  const { ref: teamRef, snap: teamSnap } = await loadTeam(id);
  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (!isCaptain(teamSnap, uid)) {
    return NextResponse.json({ error: "Captain only" }, { status: 403 });
  }

  const inviteCode = await generateUniqueInviteCode(isInviteCodeTaken);
  await teamRef.update({
    inviteCode,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, inviteCode });
}
