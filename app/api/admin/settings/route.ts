import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { adminNotificationSettingsSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
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
  const parsed = adminNotificationSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ref = adminDb.collection("adminSettings").doc(auth.uid);
  const now = FieldValue.serverTimestamp();
  const existing = await ref.get();
  await ref.set(
    {
      uid: auth.uid,
      email: parsed.data.email === "" ? null : parsed.data.email,
      phone: parsed.data.phone === "" ? null : parsed.data.phone,
      events: parsed.data.events,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}
