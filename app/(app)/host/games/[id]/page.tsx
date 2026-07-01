import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { canUseGame, isAdminUid } from "@/lib/games/authz";
import type { GameKind, GameSection } from "@/types/firestore";
import { GameManager, type HostOption } from "./GameManager";

export const dynamic = "force-dynamic";

export default async function ManageGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/games/${id}`);

  const snap = await adminDb.collection("games").doc(id).get();
  if (!snap.exists) notFound();
  const g = snap.data() ?? {};
  const hostUids = (g.hostUids as string[] | undefined) ?? [];

  if (!(await canUseGame(session.uid, hostUids))) {
    redirect("/host/games");
  }

  const ownerUid = String(g.ownerUid ?? "");
  const canEdit = session.uid === ownerUid || (await isAdminUid(session.uid));

  // Resolve names for everyone relevant: owner, current assignees, and the
  // owner's sub-hosts (the only valid assignment candidates).
  const ownerSnap = await adminDb.collection("users").doc(ownerUid).get();
  const subUids = (ownerSnap.data()?.subHostUids as string[] | undefined) ?? [];
  const allUids = Array.from(new Set([ownerUid, ...hostUids, ...subUids]));
  const userSnaps = await Promise.all(
    allUids.map((u) => adminDb.collection("users").doc(u).get()),
  );
  const nameByUid = new Map<string, string>();
  const emailByUid = new Map<string, string>();
  for (const s of userSnaps) {
    if (!s.exists) continue;
    nameByUid.set(s.id, String(s.data()?.displayName ?? ""));
    emailByUid.set(s.id, String(s.data()?.email ?? ""));
  }

  const assigned: HostOption[] = hostUids.map((u) => ({
    uid: u,
    displayName: nameByUid.get(u) ?? "Unknown",
    email: emailByUid.get(u) ?? "",
    isOwner: u === ownerUid,
  }));
  const candidates: HostOption[] = subUids.map((u) => ({
    uid: u,
    displayName: nameByUid.get(u) ?? "Unknown",
    email: emailByUid.get(u) ?? "",
    isOwner: false,
  }));

  return (
    <GameManager
      gameId={id}
      ownerName={nameByUid.get(ownerUid) ?? "Unknown"}
      canEdit={canEdit}
      kind={(g.kind as GameKind | undefined) === "scorecard" ? "scorecard" : "quiz"}
      initialName={String(g.name ?? "")}
      initialSections={(g.sections as GameSection[] | undefined) ?? []}
      assigned={assigned}
      candidates={candidates}
    />
  );
}
