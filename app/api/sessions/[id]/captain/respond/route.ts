import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import type { SessionTakeoverRequest } from "@/types/firestore";

export const runtime = "nodejs";

const respondSchema = z.object({ allow: z.boolean() });

interface PlayerLike {
  teamId?: string | null;
}
interface TeamStateLike {
  captainUid?: string | null;
  pendingTakeover?: SessionTakeoverRequest | null;
}

/**
 * The current captain answers a pending takeover request. `allow` transfers
 * captaincy to the requester; otherwise the request is dismissed and the
 * captain stays. Expired requests are left for the requester to auto-claim.
 */
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const ref = adminDb.collection("gameSessions").doc(id);
  const uid = session.uid;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data() ?? {};
      const players = (data.players as Record<string, PlayerLike>) ?? {};
      const teamId = players[uid]?.teamId ?? null;
      if (!teamId) throw new Error("NOT_ON_TEAM");

      const teams = (data.teams as Record<string, TeamStateLike>) ?? {};
      const team = teams[teamId] ?? {};
      if ((team.captainUid ?? null) !== uid) throw new Error("NOT_CAPTAIN");
      const pending = team.pendingTakeover ?? null;
      if (!pending) throw new Error("NO_REQUEST");

      if (parsed.data.allow) {
        tx.update(ref, {
          [`teams.${teamId}.captainUid`]: pending.requesterUid,
          [`teams.${teamId}.pendingTakeover`]: null,
        });
      } else {
        tx.update(ref, { [`teams.${teamId}.pendingTakeover`]: null });
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Not found"],
      NOT_ON_TEAM: [400, "You're not on a team in this game"],
      NOT_CAPTAIN: [403, "Only the current captain can respond"],
      NO_REQUEST: [409, "No takeover request to answer"],
    };
    const entry = map[msg];
    if (entry) return NextResponse.json({ error: entry[1] }, { status: entry[0] });
    return NextResponse.json({ error: "Respond failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
