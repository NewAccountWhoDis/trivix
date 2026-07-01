import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { decideTakeover, isPresent } from "@/lib/games/captain";
import type { SessionTakeoverRequest } from "@/types/firestore";

export const runtime = "nodejs";

interface PlayerLike {
  displayName?: string;
  teamId?: string | null;
  lastSeenAt?: { toMillis?: () => number } | null;
}

interface TeamStateLike {
  captainUid?: string | null;
  pendingTakeover?: SessionTakeoverRequest | null;
}

/**
 * Request to become the team captain. Grants instantly when the team has no
 * captain, when the caller already is captain, when the current captain isn't
 * present, or when the caller's own 30s request has elapsed (auto-approve).
 * Otherwise opens a pending request for the current captain to answer.
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
  const uid = session.uid;
  const nowMs = Date.now();

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("NOT_FOUND");
      const data = snap.data() ?? {};
      if (data.status !== "active" && data.status !== "lobby") {
        throw new Error("NOT_ACTIVE");
      }
      const players = (data.players as Record<string, PlayerLike>) ?? {};
      const me = players[uid];
      if (!me) throw new Error("NOT_A_PLAYER");
      const teamId = me.teamId ?? null;
      if (!teamId) throw new Error("NOT_ON_TEAM");

      const teams = (data.teams as Record<string, TeamStateLike>) ?? {};
      const team = teams[teamId] ?? {};
      const captainUid = team.captainUid ?? null;
      const pending = team.pendingTakeover ?? null;

      const captainPresent =
        captainUid != null &&
        players[captainUid] != null &&
        isPresent(players[captainUid]?.lastSeenAt?.toMillis?.() ?? null, nowMs);

      const decision = decideTakeover({
        captainUid,
        captainPresent,
        pending,
        requesterUid: uid,
        nowMs,
      });

      if (decision.kind === "in_progress") {
        throw new Error("IN_PROGRESS");
      }

      if (decision.kind === "claim") {
        tx.update(ref, {
          [`teams.${teamId}.captainUid`]: uid,
          [`teams.${teamId}.pendingTakeover`]: null,
        });
        return { status: "captain" as const };
      }

      // decision.kind === "pending"
      const takeover: SessionTakeoverRequest = {
        requesterUid: uid,
        requesterName: String(me.displayName ?? uid),
        deadlineMs: decision.deadlineMs,
      };
      tx.update(ref, {
        // Ensure the captain field exists so the map is well-formed.
        [`teams.${teamId}.captainUid`]: captainUid,
        [`teams.${teamId}.pendingTakeover`]: takeover,
      });
      return { status: "pending" as const, deadlineMs: decision.deadlineMs };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const map: Record<string, [number, string]> = {
      NOT_FOUND: [404, "Not found"],
      NOT_ACTIVE: [409, "Session not active"],
      NOT_A_PLAYER: [403, "Not a player in this session"],
      NOT_ON_TEAM: [400, "You're not on a team in this game"],
      IN_PROGRESS: [409, "Another takeover is already in progress"],
    };
    const entry = map[msg];
    if (entry) return NextResponse.json({ error: entry[1] }, { status: entry[0] });
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
