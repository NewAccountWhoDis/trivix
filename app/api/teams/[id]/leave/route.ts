import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  isCaptain,
  isMember,
  loadTeam,
  requireVerifiedSession,
} from "@/lib/teams/auth";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireVerifiedSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
  }
  const { uid } = session.value;

  const { id } = await ctx.params;
  const { ref: teamRef, snap: teamSnap } = await loadTeam(id);
  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (!isMember(teamSnap, uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const memberUids = (teamSnap.data()?.memberUids as string[]) ?? [];
  const wasCaptain = isCaptain(teamSnap, uid);
  const userRef = adminDb.collection("users").doc(uid);
  const now = FieldValue.serverTimestamp();

  if (memberUids.length === 1) {
    // Sole member: disband.
    const reqs = await teamRef.collection("joinRequests").get();
    const batch = adminDb.batch();
    reqs.forEach((d) => batch.delete(d.ref));
    batch.delete(teamRef);
    batch.update(userRef, { teamId: null, updatedAt: now });
    await batch.commit();
    return NextResponse.json({ ok: true, disbanded: true });
  }

  await adminDb.runTransaction(async (tx) => {
    tx.update(teamRef, {
      memberUids: FieldValue.arrayRemove(uid),
      ...(wasCaptain ? { captainUid: null } : {}),
      updatedAt: now,
    });
    tx.update(userRef, { teamId: null, updatedAt: now });
  });

  return NextResponse.json({ ok: true, disbanded: false, captainCleared: wasCaptain });
}
