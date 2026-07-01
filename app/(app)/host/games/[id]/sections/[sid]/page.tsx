import { redirect, notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { isAdminUid } from "@/lib/games/authz";
import type { GameSection } from "@/types/firestore";
import { SectionEditor } from "../SectionEditor";
import { ScorecardEditor } from "../ScorecardEditor";

export const dynamic = "force-dynamic";

export default async function EditSectionPage({
  params,
}: {
  params: Promise<{ id: string; sid: string }>;
}) {
  const { id, sid } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/games/${id}/sections/${sid}`);

  const snap = await adminDb.collection("games").doc(id).get();
  if (!snap.exists) notFound();
  const g = snap.data() ?? {};
  const ownerUid = String(g.ownerUid ?? "");
  const canEdit = session.uid === ownerUid || (await isAdminUid(session.uid));
  if (!canEdit) redirect(`/host/games/${id}`);

  const sections = (g.sections as GameSection[] | undefined) ?? [];
  const section = sections.find((s) => s.id === sid);
  if (!section) notFound();

  const Editor = g.kind === "scorecard" ? ScorecardEditor : SectionEditor;

  return (
    <Editor
      gameId={id}
      gameName={String(g.name ?? "")}
      allSections={sections}
      sectionId={sid}
      initialSection={section}
    />
  );
}
