import Link from "next/link";
import { redirect } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { getHostGroup } from "@/lib/host/scope";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { VenueRow } from "./VenueRow";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function HostPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/host");

  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  const u = userSnap.data() ?? {};
  const role = u.role as string | undefined;
  const hostStatus = u.hostStatus as string | undefined;
  const isMainHost =
    role === "host" &&
    hostStatus === "approved" &&
    (u.mainHostUid ?? null) === null &&
    Number(u.subHostCap ?? 0) > 0;

  if (role !== "host" || hostStatus !== "approved") {
    return (
      <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto">
        <h1 className="font-display text-4xl tracking-[3px] mb-4">
          HOST TOOLS
        </h1>
        <Card>
          <div className="p-6">
            <p className="text-text-muted">
              {hostStatus === "pending"
                ? "Your host application is still under review."
                : "Host tools are only available to approved hosts."}
            </p>
            <p className="mt-4">
              <Link
                href="/dashboard"
                className="text-brand-red hover:underline"
              >
                Back to dashboard
              </Link>
            </p>
          </div>
        </Card>
      </main>
    );
  }

  const group = await getHostGroup(session.uid);
  const snap = await adminDb
    .collection("venues")
    .where("ownerUid", "in", group)
    .orderBy("createdAt", "asc")
    .get();

  // Resolve owner display names for non-self entries (sub-host viewing
  // main's venues, or main viewing sub's venues).
  const otherOwnerUids = Array.from(
    new Set(
      snap.docs
        .map((d) => String(d.data().ownerUid ?? ""))
        .filter((u) => u && u !== session.uid),
    ),
  );
  const ownerNames = new Map<string, string>();
  if (otherOwnerUids.length > 0) {
    const ownerSnaps = await Promise.all(
      otherOwnerUids.map((u) => adminDb.collection("users").doc(u).get()),
    );
    for (const s of ownerSnaps) {
      if (s.exists) {
        ownerNames.set(s.id, String(s.data()?.displayName ?? ""));
      }
    }
  }

  const venues = snap.docs.map((d) => {
    const data = d.data();
    const ownerUid = String(data.ownerUid ?? "");
    return {
      venueId: d.id,
      ownerUid,
      ownerDisplayName: ownerNames.get(ownerUid) ?? null,
      ownedByMe: ownerUid === session.uid,
      name: String(data.name ?? ""),
      address: data.address as {
        street: string;
        city: string;
        state: string;
        zip: string;
      },
      createdAt: tsToMs(data.createdAt),
    };
  });

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <nav className="mb-6 flex gap-3 text-sm flex-wrap">
        <Link
          href="/host"
          className="px-3 py-1 rounded-md bg-brand-ink border border-brand-line text-text-primary"
        >
          Venues
        </Link>
        <Link
          href="/host/question-sets"
          className="px-3 py-1 rounded-md text-text-muted hover:text-text-primary transition"
        >
          Question sets
        </Link>
        {isMainHost && (
          <Link
            href="/host/sub-hosts"
            className="px-3 py-1 rounded-md text-text-muted hover:text-text-primary transition"
          >
            Sub-hosts
          </Link>
        )}
        <Link
          href="/host/games/new"
          className="px-3 py-1 rounded-md text-brand-red hover:underline transition"
        >
          Start a game →
        </Link>
      </nav>
      <header className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Host tools</p>
          <h1 className="font-display text-4xl tracking-[3px]">VENUES</h1>
        </div>
        <Button asChild>
          <Link href="/host/venues/new">Add venue</Link>
        </Button>
      </header>

      {venues.length === 0 ? (
        <Card>
          <div className="p-6">
            <p className="text-text-muted">
              No venues yet. Add the first place you&apos;ll run trivia.
            </p>
            <div className="mt-4">
              <Button asChild variant="secondary">
                <Link href="/host/venues/new">Add your first venue</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-brand-line">
            {venues.map((v) => (
              <VenueRow key={v.venueId} venue={v} />
            ))}
          </ul>
        </Card>
      )}
    </main>
  );
}
