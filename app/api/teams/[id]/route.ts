import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import {
  isCaptain,
  loadTeam,
  requireVerifiedSession,
} from "@/lib/teams/auth";
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
  const callerIsMember = memberUids.includes(session.uid);
  const callerIsCaptain = captainUid === session.uid;
  if (!callerIsMember && !callerIsCaptain) {
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
    inviteCode:
      callerIsMember || callerIsCaptain ? String(t.inviteCode ?? "") : null,
    captainUid,
    memberUids,
    createdBy: String(t.createdBy ?? ""),
    createdAt: tsToMs(t.createdAt),
    updatedAt: tsToMs(t.updatedAt),
    members,
  });
}

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await requireVerifiedSession();
  if (!session.ok) {
    return NextResponse.json({ error: session.error }, { status: session.status });
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

  const memberUids = (teamSnap.data()?.memberUids as string[] | undefined) ?? [];
  const now = FieldValue.serverTimestamp();

  const reqs = await teamRef.collection("joinRequests").get();
  const batch = adminDb.batch();
  reqs.forEach((d) => batch.delete(d.ref));
  for (const memberUid of memberUids) {
    batch.update(adminDb.collection("users").doc(memberUid), {
      teamId: null,
      updatedAt: now,
    });
  }
  batch.delete(teamRef);
  await batch.commit();

  return NextResponse.json({ ok: true });
}
