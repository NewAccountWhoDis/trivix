import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export const runtime = "nodejs";

export async function POST(): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userRef = adminDb.collection("users").doc(session.uid);
  const now = FieldValue.serverTimestamp();

  await userRef.update({
    deletionRequestedAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const userRef = adminDb.collection("users").doc(session.uid);
  await userRef.update({
    deletionRequestedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ ok: true });
}
