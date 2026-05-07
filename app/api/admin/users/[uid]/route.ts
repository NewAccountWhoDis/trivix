import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { userActionSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ uid: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = userActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { uid } = await ctx.params;
  if (uid === auth.uid) {
    return NextResponse.json(
      { error: "You cannot perform this action on yourself" },
      { status: 400 },
    );
  }

  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const user = userSnap.data() ?? {};
  const now = FieldValue.serverTimestamp();

  if (parsed.data.action === "revoke-host") {
    const appRef = adminDb.collection("hostApplications").doc(uid);
    const batch = adminDb.batch();
    batch.update(userRef, {
      role: "player",
      hostStatus: "none",
      updatedAt: now,
    });
    const appSnap = await appRef.get();
    if (appSnap.exists) {
      batch.update(appRef, {
        status: "denied",
        decidedAt: now,
        decidedBy: auth.uid,
      });
    }
    await batch.commit();
    return NextResponse.json({ ok: true });
  }

  // action === "delete": cascade through team memberships, sentinels, auth.
  const teamId = (user.teamId as string | null | undefined) ?? null;
  const displayNameKey = String(user.displayNameKey ?? "");

  if (teamId) {
    const teamRef = adminDb.collection("teams").doc(teamId);
    const teamSnap = await teamRef.get();
    if (teamSnap.exists) {
      const teamData = teamSnap.data() ?? {};
      const memberUids = (teamData.memberUids as string[] | undefined) ?? [];
      const wasCaptain =
        (teamData.captainUid as string | null | undefined) === uid;

      if (memberUids.length === 1 && memberUids[0] === uid) {
        // Sole member: disband team.
        const reqs = await teamRef.collection("joinRequests").get();
        const batch = adminDb.batch();
        reqs.forEach((d) => batch.delete(d.ref));
        batch.delete(teamRef);
        await batch.commit();
      } else {
        await teamRef.update({
          memberUids: FieldValue.arrayRemove(uid),
          ...(wasCaptain ? { captainUid: null } : {}),
          updatedAt: now,
        });
      }
    }
  }

  // Delete sentinels + docs + auth account.
  const batch = adminDb.batch();
  if (displayNameKey) {
    batch.delete(adminDb.collection("displayNames").doc(displayNameKey));
  }
  batch.delete(adminDb.collection("hostApplications").doc(uid));
  batch.delete(userRef);
  await batch.commit();

  await adminAuth.deleteUser(uid).catch(() => {
    // If auth user doesn't exist (already deleted, or never created), ignore.
  });

  return NextResponse.json({ ok: true });
}
