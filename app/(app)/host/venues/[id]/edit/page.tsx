import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { VenueForm } from "../../VenueForm";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await verifySession();
  if (!session) redirect(`/login?next=/host/venues/${id}/edit`);

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  if (u.role !== "host" || u.hostStatus !== "approved") {
    redirect("/host");
  }

  const venueSnap = await adminDb.collection("venues").doc(id).get();
  if (!venueSnap.exists) notFound();
  const v = venueSnap.data() ?? {};
  if (v.ownerUid !== session.uid) notFound();

  const initial = {
    name: String(v.name ?? ""),
    street: String(v.address?.street ?? ""),
    city: String(v.address?.city ?? ""),
    state: String(v.address?.state ?? ""),
    zip: String(v.address?.zip ?? ""),
  };

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
      <h1 className="font-display text-4xl tracking-[3px] mb-2">EDIT VENUE</h1>
      <p className="text-text-muted mb-8">{initial.name}</p>
      <VenueForm mode="edit" venueId={id} initial={initial} />
    </main>
  );
}
