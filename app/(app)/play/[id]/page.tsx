import { redirect } from "next/navigation";
import { verifySession } from "@/lib/firebase/session";
import { PlayerLiveView } from "./PlayerLiveView";

export default async function PlayerLivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/play/${id}`);

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto">
      <PlayerLiveView sessionId={id} myUid={session.uid} />
    </main>
  );
}
