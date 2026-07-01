import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import type { GameSection } from "@/types/firestore";

export const dynamic = "force-dynamic";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function GamesPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host/games");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

  const snap = await adminDb
    .collection("games")
    .where("hostUids", "array-contains", session.uid)
    .orderBy("createdAt", "asc")
    .get();

  const games = snap.docs.map((d) => {
    const data = d.data();
    const sections = (data.sections as GameSection[] | undefined) ?? [];
    return {
      gameId: d.id,
      name: String(data.name ?? ""),
      isScorecard: data.kind === "scorecard",
      ownedByMe: String(data.ownerUid ?? "") === session.uid,
      sectionCount: sections.length,
      questionCount: sections.reduce(
        (n, s) => n + (s.questions?.length ?? 0),
        0,
      ),
      createdAt: tsToMs(data.createdAt),
    };
  });

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/host"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back
        </Link>
      </div>

      <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Host tools</p>
          <h1 className="font-display text-4xl tracking-[3px]">GAMES</h1>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link href="/host/sessions/new">Start a game</Link>
          </Button>
          <Button asChild>
            <Link href="/host/games/new">Create game</Link>
          </Button>
        </div>
      </header>

      {games.length === 0 ? (
        <Card>
          <div className="p-6">
            <p className="text-text-muted">
              No games yet. Create your first game, then add sections and
              questions.
            </p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href="/host/games/new">Create your first game</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-brand-line">
            {games.map((g) => (
              <li key={g.gameId}>
                <Link
                  href={`/host/games/${g.gameId}`}
                  className="flex items-center justify-between gap-4 p-5 hover:bg-brand-ink/40 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">
                        {g.name}
                      </span>
                      {g.isScorecard && (
                        <span className="text-[10px] uppercase tracking-[2px] text-text-faint border border-brand-line rounded px-1.5 py-0.5">
                          Scorecard
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-faint mt-0.5">
                      {g.sectionCount} {g.isScorecard ? "round" : "section"}
                      {g.sectionCount === 1 ? "" : "s"} · {g.questionCount}{" "}
                      question{g.questionCount === 1 ? "" : "s"}
                      {g.ownedByMe ? "" : " · Shared with you"}
                    </div>
                  </div>
                  <span className="text-text-muted text-sm">Manage →</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
