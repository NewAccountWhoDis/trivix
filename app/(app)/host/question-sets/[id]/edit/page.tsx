import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { QuestionSetEditor } from "../../QuestionSetEditor";

interface RawQuestion {
  prompt?: string;
  choices?: string[];
  correctIndex?: number;
  points?: number;
}

export default async function EditQuestionSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/question-sets/${id}/edit`);

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

  const ref = adminDb.collection("questionSets").doc(id);
  const snap = await ref.get();
  if (!snap.exists) notFound();
  const s = snap.data() ?? {};
  if (s.ownerUid !== session.uid) notFound();

  const rawQuestions = (s.questions as RawQuestion[] | undefined) ?? [];
  const questions = rawQuestions.map((q) => ({
    prompt: String(q.prompt ?? ""),
    choices: [
      String(q.choices?.[0] ?? ""),
      String(q.choices?.[1] ?? ""),
      String(q.choices?.[2] ?? ""),
      String(q.choices?.[3] ?? ""),
    ] as [string, string, string, string],
    correctIndex: (q.correctIndex ?? 0) as 0 | 1 | 2 | 3,
    points: Number(q.points ?? 1),
  }));

  const initial = {
    name: String(s.name ?? ""),
    description: String(s.description ?? ""),
    questions,
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/host/question-sets"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back
        </Link>
      </div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">EDIT SET</h1>
      <p className="text-text-muted mb-8">{initial.name}</p>
      <QuestionSetEditor mode="edit" setId={id} initial={initial} />
    </main>
  );
}
