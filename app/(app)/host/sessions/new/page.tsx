import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { getHostGroup } from "@/lib/host/scope";
import type { GameSection } from "@/types/firestore";
import { NewGameForm } from "./NewGameForm";

export const dynamic = "force-dynamic";

export default async function NewGamePage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host/sessions/new");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

  const group = await getHostGroup(session.uid);
  const [venuesSnap, gamesSnap] = await Promise.all([
    adminDb
      .collection("venues")
      .where("ownerUid", "in", group)
      .orderBy("createdAt", "asc")
      .get(),
    adminDb
      .collection("games")
      .where("hostUids", "array-contains", session.uid)
      .orderBy("createdAt", "asc")
      .get(),
  ]);

  const venues = venuesSnap.docs.map((d) => ({
    venueId: d.id,
    name: String(d.data().name ?? ""),
  }));
  const games = gamesSnap.docs.map((d) => {
    const sections = (d.data().sections as GameSection[] | undefined) ?? [];
    return {
      gameId: d.id,
      name: String(d.data().name ?? ""),
      questionCount: sections.reduce(
        (n, s) => n + (s.questions?.length ?? 0),
        0,
      ),
    };
  });

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
      <h1 className="font-display text-4xl tracking-[3px] mb-2">START GAME</h1>
      <p className="text-text-muted mb-8">
        Pick a venue and a game. Players will join with a 6-character code.
      </p>
      <NewGameForm venues={venues} games={games} />
    </main>
  );
}
