import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { TeamsTable, type AdminTeamRow } from "./TeamsTable";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function AdminTeamsPage() {
  const snap = await adminDb
    .collection("teams")
    .orderBy("createdAt", "asc")
    .get();

  const captainUids = Array.from(
    new Set(
      snap.docs
        .map((d) => d.data().captainUid as string | null | undefined)
        .filter((v): v is string => Boolean(v)),
    ),
  );
  const captainMap: Record<string, string> = {};
  await Promise.all(
    captainUids.map(async (uid) => {
      const u = await adminDb.collection("users").doc(uid).get();
      if (u.exists) captainMap[uid] = String(u.data()?.displayName ?? uid);
    }),
  );

  const teams: AdminTeamRow[] = snap.docs.map((d) => {
    const data = d.data();
    const captainUid = (data.captainUid as string | null | undefined) ?? null;
    const memberUids = (data.memberUids as string[] | undefined) ?? [];
    return {
      teamId: d.id,
      name: String(data.name ?? ""),
      inviteCode: String(data.inviteCode ?? ""),
      captainUid,
      captainDisplayName: captainUid ? (captainMap[captainUid] ?? null) : null,
      memberCount: memberUids.length,
      createdAt: tsToMs(data.createdAt),
    };
  });

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">TEAMS</h1>
      <TeamsTable teams={teams} />
    </div>
  );
}
