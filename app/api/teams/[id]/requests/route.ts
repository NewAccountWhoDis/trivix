import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { isCaptain, loadTeam, requireVerifiedSession } from "@/lib/teams/auth";
import type { SerializedJoinRequest } from "@/types/firestore";

export const runtime = "nodejs";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return 0;
}

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireVerifiedSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: session.error },
      { status: session.status },
    );
  }
  const { uid } = session.value;

  const { id } = await ctx.params;
  const { ref: teamRef, snap: teamSnap } = await loadTeam(id);
  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }
  if (!isCaptain(teamSnap, uid)) {
    return NextResponse.json({ error: "Captain only" }, { status: 403 });
  }

  const reqs = await teamRef
    .collection("joinRequests")
    .orderBy("requestedAt", "asc")
    .get();

  const requests: SerializedJoinRequest[] = reqs.docs.map((d) => {
    const data = d.data();
    return {
      uid: String(data.uid ?? d.id),
      displayName: String(data.displayName ?? ""),
      requestedAt: tsToMs(data.requestedAt),
    };
  });

  return NextResponse.json({ requests });
}
