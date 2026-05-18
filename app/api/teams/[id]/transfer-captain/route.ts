import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { verifySession } from "@/lib/firebase/session";
import { isCaptain, isMember, loadTeam } from "@/lib/teams/auth";
import { transferCaptainSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { uid } = session;

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
