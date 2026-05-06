import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { toDisplayNameKey } from "@/lib/validation/schemas";

export const runtime = "nodejs";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return 0;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ displayName: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { displayName } = await ctx.params;
  const key = toDisplayNameKey(displayName);
  if (!key || key.length < 3) {
    return NextResponse.json(
      { error: "Invalid display name" },
      { status: 400 },
    );
  }

  const dnSnap = await adminDb.collection("displayNames").doc(key).get();
  if (!dnSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const uid = String(dnSnap.data()?.uid ?? "");
  if (!uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const u = userSnap.data() ?? {};
  const stats = (u.stats as Record<string, unknown>) ?? {};

  return NextResponse.json({
    uid,
    displayName: String(u.displayName ?? ""),
    avatarSeed: String(u.avatarSeed ?? uid),
    createdAt: tsToMs(u.createdAt),
    role: u.role ?? "player",
    hostStatus: u.hostStatus ?? "none",
    teamId: (u.teamId as string | null | undefined) ?? null,
    stats: {
      gamesPlayed: Number(stats.gamesPlayed ?? 0),
      gamesWon: Number(stats.gamesWon ?? 0),
      longestWinStreak: Number(stats.longestWinStreak ?? 0),
      highestScore: Number(stats.highestScore ?? 0),
    },
  });
}
