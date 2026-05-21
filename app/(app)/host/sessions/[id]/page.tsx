import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { HostGameDashboard } from "./HostGameDashboard";

export default async function HostGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/sessions/${id}`);

  const ref = adminDb.collection("gameSessions").doc(id);
  const snap = await ref.get();
  if (!snap.exists) notFound();
  const data = snap.data() ?? {};
  if (data.hostUid !== session.uid) {
    redirect("/host");
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/host"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Host tools
        </Link>
      </div>
      <HostGameDashboard sessionId={id} myUid={session.uid} />
    </main>
  );
}
