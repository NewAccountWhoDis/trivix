import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { isCaptain, loadTeam } from "@/lib/teams/auth";
import { requestActionSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const ERR_TARGET_ON_TEAM = "TARGET_ON_TEAM";
const ERR_REQUEST_NOT_FOUND = "REQUEST_NOT_FOUND";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string; uid: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { uid: callerUid } = session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = requestActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { id, uid: targetUid } = await ctx.params;
  const { ref: teamRef, snap: teamSnap } = await loadTeam(id);
  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (!isCaptain(teamSnap, callerUid)) {
    return NextResponse.json({ error: "Captain only" }, { status: 403 });
  }

  const reqRef = teamRef.collection("joinRequests").doc(targetUid);
  const targetUserRef = adminDb.collection("users").doc(targetUid);

  if (parsed.data.action === "deny") {
    const existing = await reqRef.get();
    if (!existing.exists) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    await reqRef.delete();
    return NextResponse.json({ ok: true });
  }

  // approve
  try {
    await adminDb.runTransaction(async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) throw new Error(ERR_REQUEST_NOT_FOUND);
      const targetSnap = await tx.get(targetUserRef);
      if (!targetSnap.exists) throw new Error(ERR_REQUEST_NOT_FOUND);
      if ((targetSnap.data()?.teamId as string | null) !== null) {
        throw new Error(ERR_TARGET_ON_TEAM);
      }
      const now = FieldValue.serverTimestamp();
      tx.update(teamRef, {
        memberUids: FieldValue.arrayUnion(targetUid),
        updatedAt: now,
      });
      tx.update(targetUserRef, {
        teamId: id,
        teamHistory: FieldValue.arrayUnion(id),
        updatedAt: now,
      });
      tx.delete(reqRef);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_REQUEST_NOT_FOUND) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (msg === ERR_TARGET_ON_TEAM) {
      return NextResponse.json(
        { error: "User is already on a team" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Approve failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
