import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { QuestionSetEditor } from "../QuestionSetEditor";

export default async function NewQuestionSetPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host/question-sets/new");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

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
      <h1 className="font-display text-4xl tracking-[3px] mb-2">NEW SET</h1>
      <p className="text-text-muted mb-8">
        Build a deck. Each question is multiple choice with four options.
      </p>
      <QuestionSetEditor mode="create" />
    </main>
  );
}
