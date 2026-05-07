import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import {
  HostApplicationCard,
  type HostApplicationRow,
} from "@/components/admin/HostApplicationCard";
import { Card } from "@/components/ui/Card";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function HostApplicationsPage() {
  const snap = await adminDb
    .collection("hostApplications")
    .where("status", "==", "pending")
    .orderBy("appliedAt", "asc")
    .get();

  const apps: HostApplicationRow[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: String(data.uid ?? d.id),
      email: String(data.email ?? ""),
      displayName: String(data.displayName ?? ""),
      reason: (data.reason as string | null) ?? null,
      appliedAt: tsToMs(data.appliedAt),
    };
  });

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">
        HOST APPLICATIONS
      </h1>
      {apps.length === 0 ? (
        <Card>
          <div className="p-6 text-text-muted">No pending applications.</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {apps.map((a) => (
            <HostApplicationCard key={a.uid} app={a} />
          ))}
        </div>
      )}
    </div>
  );
}
