import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifySession } from "@/lib/firebase/session";
import { isMember, loadTeam } from "@/lib/teams/auth";

export const runtime = "nodejs";

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
  if (!isMember(teamSnap, uid)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if ((teamSnap.data()?.captainUid as string | null) !== null) {
    return NextResponse.json(
      { error: "Team already has a captain" },
      { status: 409 },
    );
  }

  await teamRef.update({
    captainUid: uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
