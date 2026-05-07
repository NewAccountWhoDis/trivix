import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { AdminVenuesTable, type AdminVenueRow } from "./VenuesTable";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function AdminVenuesPage() {
  const snap = await adminDb
    .collection("venues")
    .orderBy("createdAt", "asc")
    .get();

  const ownerUids = Array.from(
    new Set(
      snap.docs
        .map((d) => d.data().ownerUid as string | undefined)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const ownerMap: Record<string, string> = {};
  await Promise.all(
    ownerUids.map(async (uid) => {
      const u = await adminDb.collection("users").doc(uid).get();
      if (u.exists) ownerMap[uid] = String(u.data()?.displayName ?? uid);
    }),
  );

  const venues: AdminVenueRow[] = snap.docs.map((d) => {
    const data = d.data();
    const ownerUid = String(data.ownerUid ?? "");
    return {
      venueId: d.id,
      ownerUid,
      ownerDisplayName: ownerMap[ownerUid] ?? null,
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
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">VENUES</h1>
      <AdminVenuesTable venues={venues} />
    </div>
  );
}
