import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
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
