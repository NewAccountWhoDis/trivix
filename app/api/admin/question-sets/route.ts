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
    .collection("questionSets")
    .orderBy("createdAt", "asc")
    .get();

  const ownerUids = Array.from(
    new Set(
      snap.docs
        .map((d) => d.data().ownerUid as string | undefined)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const ownerMap: Record<string, string> = {};
  await Promise.all(
    ownerUids.map(async (uid) => {
      const u = await adminDb.collection("users").doc(uid).get();
      if (u.exists)
        ownerMap[uid] = String(u.data()?.displayName ?? uid);
    }),
  );

  const sets = snap.docs.map((d) => {
    const data = d.data();
    const ownerUid = String(data.ownerUid ?? "");
    const questions = (data.questions as unknown[] | undefined) ?? [];
    return {
      setId: d.id,
      ownerUid,
      ownerDisplayName: ownerMap[ownerUid] ?? null,
      name: String(data.name ?? ""),
      description: (data.description as string | null) ?? null,
      questionCount: questions.length,
      createdAt: tsToMs(data.createdAt),
      updatedAt: tsToMs(data.updatedAt),
    };
  });

  return NextResponse.json({ sets });
}
