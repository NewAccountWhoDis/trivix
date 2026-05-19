import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ uid: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { uid } = await ctx.params;
  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const now = FieldValue.serverTimestamp();
  await userRef.update({
    archived: true,
    archivedAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true });
}
