import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { finalizeGameSession } from "@/lib/games/finalize";

export const runtime = "nodejs";

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
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (snap.data()?.hostUid !== session.uid) {
    return NextResponse.json({ error: "Host only" }, { status: 403 });
  }
  if (snap.data()?.status === "ended") {
    return NextResponse.json({ ok: true, alreadyEnded: true });
  }
  if (snap.data()?.status !== "active") {
    return NextResponse.json({ error: "Session not active" }, { status: 409 });
  }

  await finalizeGameSession(id);
  return NextResponse.json({ ok: true });
}
