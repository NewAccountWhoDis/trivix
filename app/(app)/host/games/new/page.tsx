import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { NewGameForm } from "./NewGameForm";

export const dynamic = "force-dynamic";

export default async function CreateGamePage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host/games/new");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/host/games"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back
        </Link>
      </div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">CREATE GAME</h1>
      <p className="text-text-muted mb-8">
        Name your game. You&apos;ll add sections and questions next.
      </p>
      <NewGameForm />
    </main>
  );
}
