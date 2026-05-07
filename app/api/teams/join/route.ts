import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { joinTeamSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  if (!session.emailVerified) {
    return NextResponse.json(
      { error: "Verify your email first" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = joinTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const { inviteCode } = parsed.data;

  // Look up team by invite code (admin SDK bypasses rules)
  const teamSnap = await adminDb
    .collection("teams")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();
  if (teamSnap.empty) {
    return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
  }
  const teamDoc = teamSnap.docs[0]!;
  const teamId = teamDoc.id;
  const teamData = teamDoc.data();

  if ((teamData.memberUids as string[] | undefined)?.includes(session.uid)) {
    return NextResponse.json(
      { error: "You are already a member of this team" },
      { status: 409 },
    );
  }

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const userData = userSnap.data() ?? {};
  if (userData.teamId) {
    return NextResponse.json(
      { error: "You are already on a team" },
      { status: 409 },
    );
  }

  const reqRef = adminDb
    .collection("teams")
    .doc(teamId)
    .collection("joinRequests")
    .doc(session.uid);

  const existing = await reqRef.get();
  if (existing.exists) {
    return NextResponse.json({ ok: true, teamId, alreadyRequested: true });
  }

  await reqRef.set({
    uid: session.uid,
    displayName: String(userData.displayName ?? ""),
    requestedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, teamId });
}
