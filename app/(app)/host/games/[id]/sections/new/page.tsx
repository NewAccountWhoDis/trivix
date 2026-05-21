import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { isAdminUid } from "@/lib/games/authz";
import type { GameSection } from "@/types/firestore";
import { SectionEditor } from "../SectionEditor";

export const dynamic = "force-dynamic";

export default async function NewSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/games/${id}/sections/new`);

  const snap = await adminDb.collection("games").doc(id).get();
  if (!snap.exists) notFound();
  const g = snap.data() ?? {};
  const ownerUid = String(g.ownerUid ?? "");
  const canEdit = session.uid === ownerUid || (await isAdminUid(session.uid));
  if (!canEdit) redirect(`/host/games/${id}`);

  return (
    <SectionEditor
      gameId={id}
      gameName={String(g.name ?? "")}
      allSections={(g.sections as GameSection[] | undefined) ?? []}
      sectionId={null}
      initialSection={null}
    />
  );
}
