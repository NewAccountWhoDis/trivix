import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { PresenterView } from "./PresenterView";

export default async function PresenterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/sessions/${id}/present`);

  const ref = adminDb.collection("gameSessions").doc(id);
  const snap = await ref.get();
  if (!snap.exists) notFound();
  const data = snap.data() ?? {};
  if (data.hostUid !== session.uid) {
    redirect("/host");
  }

  return (
    <main className="min-h-screen bg-brand-ink text-text-primary">
      <PresenterView sessionId={id} myUid={session.uid} />
    </main>
  );
}
