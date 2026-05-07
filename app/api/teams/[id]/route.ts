import { NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import type { TeamMemberSummary } from "@/types/firestore";

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
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const teamSnap = await adminDb.collection("teams").doc(id).get();
  if (!teamSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const t = teamSnap.data() ?? {};

  const memberUids = (t.memberUids as string[] | undefined) ?? [];
  const captainUid = (t.captainUid as string | null | undefined) ?? null;
  const isMember = memberUids.includes(session.uid);
  const isCaptain = captainUid === session.uid;
  if (!isMember && !isCaptain) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const memberSnaps =
    memberUids.length === 0
      ? []
      : await Promise.all(
          memberUids.map((uid) =>
            adminDb.collection("users").doc(uid).get(),
          ),
        );

  const members: TeamMemberSummary[] = memberSnaps
    .filter((s) => s.exists)
    .map((s) => {
      const u = s.data() ?? {};
      return {
        uid: s.id,
        displayName: String(u.displayName ?? ""),
        avatarSeed: String(u.avatarSeed ?? s.id),
        isCaptain: s.id === captainUid,
      };
    });

  return NextResponse.json({
    teamId: id,
    name: String(t.name ?? ""),
    inviteCode: isMember || isCaptain ? String(t.inviteCode ?? "") : null,
    captainUid,
    memberUids,
    createdBy: String(t.createdBy ?? ""),
    createdAt: tsToMs(t.createdAt),
    updatedAt: tsToMs(t.updatedAt),
    members,
  });
}
