import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { canUseGame } from "@/lib/games/authz";
import type { GameKind, GameSection } from "@/types/firestore";
import { GamePreview } from "./GamePreview";

export const dynamic = "force-dynamic";

export default async function PreviewGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/games/${id}/preview`);

  const snap = await adminDb.collection("games").doc(id).get();
  if (!snap.exists) notFound();
  const g = snap.data() ?? {};
  const hostUids = (g.hostUids as string[] | undefined) ?? [];
  if (!(await canUseGame(session.uid, hostUids))) {
    redirect("/host/games");
  }

  return (
    <GamePreview
      gameId={id}
      gameName={String(g.name ?? "")}
      kind={
        (g.kind as GameKind | undefined) === "scorecard" ? "scorecard" : "quiz"
      }
      sections={(g.sections as GameSection[] | undefined) ?? []}
    />
  );
}
