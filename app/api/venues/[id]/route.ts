import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { requireApprovedHost } from "@/lib/venues/auth";
import { getHostGroup } from "@/lib/host/scope";
import { updateVenueSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

async function isAdminUid(uid: string): Promise<boolean> {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists && Boolean(snap.data()?.isAdmin);
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
  const venueRef = adminDb.collection("venues").doc(id);
  const venueSnap = await venueRef.get();
  if (!venueSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const v = venueSnap.data() ?? {};
  const ownerUid = String(v.ownerUid ?? "");
  const group = await getHostGroup(session.uid);
  if (!group.includes(ownerUid) && !(await isAdminUid(session.uid))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    venueId: id,
    ownerUid,
    name: String(v.name ?? ""),
    address: v.address,
    createdAt: tsToMs(v.createdAt),
    updatedAt: tsToMs(v.updatedAt),
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
  const parsed = updateVenueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await ctx.params;
  const venueRef = adminDb.collection("venues").doc(id);
  const venueSnap = await venueRef.get();
  if (!venueSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (venueSnap.data()?.ownerUid !== auth.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await venueRef.update({
    name: parsed.data.name,
    address: parsed.data.address,
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
  const venueRef = adminDb.collection("venues").doc(id);
  const venueSnap = await venueRef.get();
  if (!venueSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (venueSnap.data()?.ownerUid !== auth.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await venueRef.delete();
  return NextResponse.json({ ok: true });
}
