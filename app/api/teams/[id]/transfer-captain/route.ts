import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import {
  isCaptain,
  isMember,
  loadTeam,
  requireVerifiedSession,
} from "@/lib/teams/auth";
import { transferCaptainSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireVerifiedSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status },
    );
  }
  const { uid } = session.value;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = transferCaptainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }
  const targetUid = parsed.data.uid;

  const { id } = await ctx.params;
  const { ref: teamRef, snap: teamSnap } = await loadTeam(id);
  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (!isCaptain(teamSnap, uid)) {
    return NextResponse.json({ error: "Captain only" }, { status: 403 });
  }
  if (!isMember(teamSnap, targetUid)) {
    return NextResponse.json(
      { error: "Target is not a member" },
      { status: 400 },
    );
  }
  if (targetUid === uid) {
    return NextResponse.json({ ok: true });
  }

  await teamRef.update({
    captainUid: targetUid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}
