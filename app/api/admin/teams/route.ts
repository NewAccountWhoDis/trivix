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
    .collection("teams")
    .orderBy("createdAt", "asc")
    .get();

  // Resolve captain display names in one batch
  const captainUids = Array.from(
    new Set(
      snap.docs
        .map((d) => d.data().captainUid as string | null | undefined)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const captainMap: Record<string, string> = {};
  await Promise.all(
    captainUids.map(async (uid) => {
      const u = await adminDb.collection("users").doc(uid).get();
      if (u.exists) {
        captainMap[uid] = String(u.data()?.displayName ?? uid);
      }
    }),
  );

  const teams = snap.docs.map((d) => {
    const data = d.data();
    const captainUid = (data.captainUid as string | null | undefined) ?? null;
    const memberUids = (data.memberUids as string[] | undefined) ?? [];
    return {
      teamId: d.id,
      name: String(data.name ?? ""),
      inviteCode: String(data.inviteCode ?? ""),
      captainUid,
      captainDisplayName: captainUid ? (captainMap[captainUid] ?? null) : null,
      memberCount: memberUids.length,
      createdAt: tsToMs(data.createdAt),
    };
  });

  return NextResponse.json({ teams });
}
