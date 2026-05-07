import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await ctx.params;
  const teamRef = adminDb.collection("teams").doc(id);
  const teamSnap = await teamRef.get();
  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  const memberUids =
    (teamSnap.data()?.memberUids as string[] | undefined) ?? [];
  const now = FieldValue.serverTimestamp();

  const reqs = await teamRef.collection("joinRequests").get();
  const batch = adminDb.batch();
  reqs.forEach((d) => batch.delete(d.ref));
  for (const memberUid of memberUids) {
    batch.update(adminDb.collection("users").doc(memberUid), {
      teamId: null,
      updatedAt: now,
    });
  }
  batch.delete(teamRef);
  await batch.commit();

  return NextResponse.json({ ok: true });
}
