import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { QuestionSetRow } from "./QuestionSetRow";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function QuestionSetsPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host/question-sets");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

  const snap = await adminDb
    .collection("questionSets")
    .where("ownerUid", "==", session.uid)
    .orderBy("createdAt", "asc")
    .get();

  const sets = snap.docs.map((d) => {
    const data = d.data();
    const questions = (data.questions as unknown[] | undefined) ?? [];
    return {
      setId: d.id,
      name: String(data.name ?? ""),
      description: (data.description as string | null) ?? null,
      questionCount: questions.length,
      updatedAt: tsToMs(data.updatedAt),
    };
  });

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">
            <Link href="/host" className="hover:text-text-primary underline">
              Host tools
            </Link>{" "}
            ›
          </p>
          <h1 className="font-display text-4xl tracking-[3px]">
            QUESTION SETS
          </h1>
        </div>
        <Button asChild>
          <Link href="/host/question-sets/new">New set</Link>
        </Button>
      </header>

      {sets.length === 0 ? (
        <Card>
          <div className="p-6">
            <p className="text-text-muted">
              No question sets yet. Build your first deck of trivia.
            </p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href="/host/question-sets/new">
                  Create your first set
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-brand-line">
            {sets.map((s) => (
              <QuestionSetRow key={s.setId} set={s} />
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
