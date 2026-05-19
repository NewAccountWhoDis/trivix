import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { getHostGroup } from "@/lib/host/scope";
import { NewGameForm } from "./NewGameForm";

export default async function NewGamePage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host/games/new");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

  const group = await getHostGroup(session.uid);
  const [venuesSnap, setsSnap] = await Promise.all([
    adminDb
      .collection("venues")
      .where("ownerUid", "in", group)
      .orderBy("createdAt", "asc")
      .get(),
    adminDb
      .collection("questionSets")
      .where("ownerUid", "in", group)
      .orderBy("createdAt", "asc")
      .get(),
  ]);

  const venues = venuesSnap.docs.map((d) => ({
    venueId: d.id,
    name: String(d.data().name ?? ""),
  }));
  const sets = setsSnap.docs.map((d) => ({
    setId: d.id,
    name: String(d.data().name ?? ""),
    questionCount: ((d.data().questions as unknown[] | undefined) ?? []).length,
  }));

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/host"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back
        </Link>
      </div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">START GAME</h1>
      <p className="text-text-muted mb-8">
        Pick a venue and a question set. Players will join with a 6-character
        code.
      </p>
      <NewGameForm venues={venues} sets={sets} />
    </main>
  );
}
