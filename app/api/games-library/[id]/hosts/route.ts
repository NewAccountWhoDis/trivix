import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedHost } from "@/lib/venues/auth";
import { assignableHostUids, canEditGame } from "@/lib/games/authz";
import { assignHostsSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Replace the game's assigned hosts. Owner/admin only. The owner is always
 * kept, and assigned uids are restricted to sub-hosts on the owner's account.
 */
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = assignHostsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("games").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ownerUid = String(snap.data()?.ownerUid ?? "");
  if (!(await canEditGame(auth.uid, ownerUid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allowed = await assignableHostUids(ownerUid);
  const invalid = parsed.data.hostUids.filter((u) => !allowed.includes(u));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "You can only assign sub-hosts on your account." },
      { status: 400 },
    );
  }

  // Owner always retains access.
  const hostUids = Array.from(new Set([ownerUid, ...parsed.data.hostUids]));
  await ref.update({ hostUids, updatedAt: FieldValue.serverTimestamp() });

  return NextResponse.json({ ok: true, hostUids });
}
