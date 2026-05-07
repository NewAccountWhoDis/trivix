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

  const snap = await adminDb.collection("users").orderBy("createdAt", "asc").get();
  const users = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: String(data.email ?? ""),
      displayName: String(data.displayName ?? ""),
      role: data.role ?? "player",
      hostStatus: data.hostStatus ?? "none",
      isAdmin: Boolean(data.isAdmin),
      teamId: (data.teamId as string | null | undefined) ?? null,
      createdAt: tsToMs(data.createdAt),
    };
  });

  return NextResponse.json({ users });
}
