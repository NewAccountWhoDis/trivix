import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export const runtime = "nodejs";

/**
 * Presence ping. Stamps the caller's `lastSeenAt` so teammates can tell who's
 * currently live — used to decide instant vs. approval-gated captain takeover.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("gameSessions").doc(id);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const players = (snap.data()?.players as Record<string, unknown>) ?? {};
      if (!players[session.uid]) throw new Error("NOT_A_PLAYER");
      tx.update(ref, {
        [`players.${session.uid}.lastSeenAt`]: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (msg === "NOT_A_PLAYER") {
      return NextResponse.json({ error: "Not a player" }, { status: 403 });
    }
    return NextResponse.json({ error: "Heartbeat failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
