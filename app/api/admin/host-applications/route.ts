import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const snap = await adminDb
    .collection("hostApplications")
    .where("status", "==", "pending")
    .orderBy("appliedAt", "asc")
    .get();

  const applications = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: String(data.uid ?? d.id),
      email: String(data.email ?? ""),
      displayName: String(data.displayName ?? ""),
      reason: (data.reason as string | null) ?? null,
      status: String(data.status ?? "pending"),
      appliedAt: tsToMs(data.appliedAt),
    };
  });

  return NextResponse.json({ applications });
}
