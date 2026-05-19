import Link from "next/link";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { Card } from "@/components/ui/Card";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export const dynamic = "force-dynamic";

export default async function AccountReviewsPage() {
  const snap = await adminDb
    .collection("users")
    .where("deletionRequestedAt", "!=", null)
    .where("archived", "==", false)
    .orderBy("deletionRequestedAt", "asc")
    .get();

  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: String(data.uid ?? d.id),
      displayName: String(data.displayName ?? ""),
      email: String(data.email ?? ""),
      requestedAt: tsToMs(data.deletionRequestedAt),
    };
  });

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-6">
        ACCOUNTS FOR REVIEW
      </h1>
      {rows.length === 0 ? (
        <Card>
          <div className="p-6 text-text-muted">No accounts to review.</div>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-brand-line">
            {rows.map((r) => (
              <li key={r.uid} className="p-5">
                <Link
                  href={`/admin/account-reviews/${r.uid}`}
                  className="flex items-center justify-between gap-4 hover:opacity-80 transition"
                >
                  <div className="min-w-0">
                    <div className="text-text-primary font-medium truncate">
                      @{r.displayName}
                    </div>
                    <div className="text-xs text-text-faint truncate">
                      {r.email}
                    </div>
                  </div>
                  <div className="text-xs text-text-muted shrink-0">
                    Requested{" "}
                    {r.requestedAt
                      ? new Date(r.requestedAt).toLocaleDateString()
                      : "—"}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
