import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedHost } from "@/lib/venues/auth";
import { createVenueSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export async function POST(request: Request): Promise<NextResponse> {
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
  const parsed = createVenueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ref = adminDb.collection("venues").doc();
  const venueId = ref.id;
  const now = FieldValue.serverTimestamp();
  await ref.set({
    venueId,
    ownerUid: auth.uid,
    name: parsed.data.name,
    address: parsed.data.address,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, venueId });
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const snap = await adminDb
    .collection("venues")
    .where("ownerUid", "==", auth.uid)
    .orderBy("createdAt", "asc")
    .get();

  const venues = snap.docs.map((d) => {
    const data = d.data();
    return {
      venueId: d.id,
      ownerUid: String(data.ownerUid ?? auth.uid),
      name: String(data.name ?? ""),
      address: data.address,
      createdAt: tsToMs(data.createdAt),
      updatedAt: tsToMs(data.updatedAt),
    };
  });

  return NextResponse.json({ venues });
}
