import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

function tsToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const snap = await adminDb
    .collection("gameSessions")
    .orderBy("createdAt", "desc")
    .limit(100)
    .get();

  const hostUids = Array.from(
    new Set(
      snap.docs
        .map((d) => d.data().hostUid as string | undefined)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const hostMap: Record<string, string> = {};
  await Promise.all(
    hostUids.map(async (uid) => {
      const u = await adminDb.collection("users").doc(uid).get();
      if (u.exists) hostMap[uid] = String(u.data()?.displayName ?? uid);
    }),
  );

  const sessions = snap.docs.map((d) => {
    const data = d.data();
    const hostUid = String(data.hostUid ?? "");
    const players = (data.players as Record<string, unknown>) ?? {};
    return {
      sessionId: d.id,
      hostUid,
      hostDisplayName: hostMap[hostUid] ?? null,
      venueNameSnapshot: String(data.venueNameSnapshot ?? ""),
      questionSetNameSnapshot: String(data.questionSetNameSnapshot ?? ""),
      status: data.status ?? "lobby",
      sessionCode: String(data.sessionCode ?? ""),
      playerCount: Object.keys(players).length,
      createdAt: tsToMs(data.createdAt),
      endedAt: tsToMs(data.endedAt),
    };
  });

  return NextResponse.json({ sessions });
}
