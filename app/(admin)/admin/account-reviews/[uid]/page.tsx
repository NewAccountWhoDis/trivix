import Link from "next/link";
import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { Card } from "@/components/ui/Card";
import { formatStoredUsPhone } from "@/lib/utils/phone";
import { ConfirmDeletionButton } from "./ConfirmDeletionButton";

function tsToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

export const dynamic = "force-dynamic";

export default async function AccountReviewDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) notFound();
  const u = snap.data() ?? {};

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/account-reviews"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back to reviews
        </Link>
      </div>
      <h1 className="font-display text-3xl tracking-[3px] mb-2">
        {String(u.firstName ?? "")} {String(u.lastName ?? "")}
      </h1>
      <p className="text-text-muted mb-6">@{String(u.displayName ?? "")}</p>

      <Card className="mb-6">
        <div className="grid sm:grid-cols-2 gap-4 p-5 text-sm">
          <Field label="Email" value={String(u.email ?? "")} />
          <Field
            label="Phone"
            value={
              u.phone
                ? formatStoredUsPhone(String(u.phone))
                : "—"
            }
          />
          <Field label="Role" value={String(u.role ?? "")} />
          <Field
            label="Host status"
            value={String(u.hostStatus ?? "none")}
          />
          <Field
            label="Joined"
            value={
              tsToMs(u.createdAt)
                ? new Date(tsToMs(u.createdAt)!).toLocaleDateString()
                : "—"
            }
          />
          <Field
            label="Deletion requested"
            value={
              tsToMs(u.deletionRequestedAt)
                ? new Date(tsToMs(u.deletionRequestedAt)!).toLocaleString()
                : "—"
            }
          />
          <Field label="Team" value={(u.teamId as string | null) ?? "—"} />
          <Field label="Admin" value={u.isAdmin ? "Yes" : "No"} />
        </div>
      </Card>

      <div className="bg-brand-ink border border-brand-line rounded-md p-4 mb-6 text-sm text-text-muted">
        After confirming below, this account is marked as archived. Delete the
        Firebase Auth user manually in the Firebase console. The user will see
        an &quot;account removed&quot; screen if they try to log in.
      </div>

      <ConfirmDeletionButton uid={uid} displayName={String(u.displayName ?? "")} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[3px] text-text-faint mb-1">
        {label}
      </div>
      <div className="text-text-primary">{value || "—"}</div>
    </div>
  );
}
