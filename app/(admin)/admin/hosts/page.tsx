import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { Card } from "@/components/ui/Card";
import {
  HostsAdminTable,
  type MainHostRow,
  type SubHostRow,
} from "@/components/admin/HostsAdminTable";

function tsToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

export const dynamic = "force-dynamic";

export default async function AdminHostsPage() {
  const snap = await adminDb
    .collection("users")
    .where("role", "==", "host")
    .where("hostStatus", "==", "approved")
    .get();

  const byUid = new Map<string, MainHostRow>();
  const allDocs = snap.docs.map((d) => d.data());

  // First pass: main hosts.
  for (const data of allDocs) {
    if ((data.mainHostUid ?? null) !== null) continue;
    byUid.set(String(data.uid), {
      uid: String(data.uid),
      displayName: String(data.displayName ?? ""),
      email: String(data.email ?? ""),
      hostExpiresAt: tsToMs(data.hostExpiresAt),
      subHostCap: Number(data.subHostCap ?? 0),
      subHosts: [],
    });
  }

  // Second pass: attach subs.
  for (const data of allDocs) {
    const main = (data.mainHostUid ?? null) as string | null;
    if (!main) continue;
    const row = byUid.get(main);
    const sub: SubHostRow = {
      uid: String(data.uid),
      displayName: String(data.displayName ?? ""),
      email: String(data.email ?? ""),
    };
    if (row) {
      row.subHosts.push(sub);
    } else {
      // Orphaned sub-host (main is missing or denied). Show separately.
      byUid.set(`orphan:${data.uid}`, {
        uid: data.uid as string,
        displayName: `(orphan) @${data.displayName}`,
        email: String(data.email ?? ""),
        hostExpiresAt: null,
        subHostCap: 0,
        subHosts: [],
        orphan: true,
      });
    }
  }

  const rows = Array.from(byUid.values()).sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">HOSTS</h1>
      {rows.length === 0 ? (
        <Card>
          <div className="p-6 text-text-muted">No approved hosts.</div>
        </Card>
      ) : (
        <HostsAdminTable rows={rows} />
      )}
    </div>
  );
}
