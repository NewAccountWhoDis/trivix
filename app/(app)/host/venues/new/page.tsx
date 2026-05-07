import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { VenueForm } from "../VenueForm";

export default async function NewVenuePage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host/venues/new");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

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
      <h1 className="font-display text-4xl tracking-[3px] mb-2">ADD VENUE</h1>
      <p className="text-text-muted mb-8">
        Where will you run trivia? You can edit or remove this later.
      </p>
      <VenueForm mode="create" />
    </main>
  );
}
