import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { notifyAdmins } from "@/lib/notifications/dispatch";

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

  const u = (await userRef.get()).data() ?? {};
  const who = `${String(u.displayName ?? session.uid)} (${String(u.email ?? "no email")})`;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const body = `${who} requested account deletion.\n\nReview: ${site}/admin/account-reviews`;
  await notifyAdmins("accountDeletionRequest", {
    subject: "Trivix: account deletion requested",
    body,
  });
  await notifyAdmins("accountsNeedReview", {
    subject: "Trivix: an account needs review",
    body,
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
