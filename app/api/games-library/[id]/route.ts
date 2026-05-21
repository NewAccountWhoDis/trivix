import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { requireApprovedHost } from "@/lib/venues/auth";
import { canEditGame, canUseGame } from "@/lib/games/authz";
import { updateGameSchema } from "@/lib/validation/schemas";
import type { GameSection } from "@/types/firestore";

export const runtime = "nodejs";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const snap = await adminDb.collection("games").doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const g = snap.data() ?? {};
  const hostUids = (g.hostUids as string[] | undefined) ?? [];
  if (!(await canUseGame(session.uid, hostUids))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    gameId: id,
    ownerUid: String(g.ownerUid ?? ""),
    hostUids,
    name: String(g.name ?? ""),
    sections: (g.sections as GameSection[] | undefined) ?? [],
    createdAt: tsToMs(g.createdAt),
    updatedAt: tsToMs(g.updatedAt),
  });
}

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
  const parsed = updateGameSchema.safeParse(body);
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

  await ref.update({
    name: parsed.data.name,
    sections: parsed.data.sections,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
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

  await ref.delete();
  return NextResponse.json({ ok: true });
}
