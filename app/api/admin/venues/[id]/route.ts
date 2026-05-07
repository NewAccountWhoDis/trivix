import { NextResponse } from "next/server";
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
  const venueRef = adminDb.collection("venues").doc(id);
  const snap = await venueRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }
  await venueRef.delete();
  return NextResponse.json({ ok: true });
}
