import Link from "next/link";
import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatStoredUsPhone } from "@/lib/utils/phone";
import { SignOutEverywhereButton } from "./SignOutEverywhereButton";

export const dynamic = "force-dynamic";

function tsToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  return null;
}

function fmtDate(ms: number | null): string {
  return ms ? new Date(ms).toLocaleDateString() : "—";
}
function fmtDateTime(ms: number | null): string {
  return ms ? new Date(ms).toLocaleString() : "—";
}
function fmtIso(iso: string | undefined): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

const PROVIDER_LABELS: Record<string, string> = {
  "password": "Email / password",
  "phone": "Phone",
  "google.com": "Google",
  "apple.com": "Apple",
};

interface SessionRow {
  ip: string;
  userAgent: string;
  createdAt: number | null;
  expiresAt: number | null;
  endedAt: number | null;
  active: boolean;
}

/** Map + sort session docs. Kept out of render so the time read stays pure. */
function buildSessions(
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
): SessionRow[] {
  const now = Date.now();
  return docs
    .map((d) => {
      const s = d.data();
      const expiresAt = tsToMs(s.expiresAt);
      const endedAt = tsToMs(s.endedAt);
      return {
        ip: String(s.ip ?? "unknown"),
        userAgent: String(s.userAgent ?? ""),
        createdAt: tsToMs(s.createdAt),
        expiresAt,
        endedAt,
        active: !endedAt && (expiresAt ?? 0) > now,
      };
    })
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) notFound();
  const u = snap.data() ?? {};
  const stats = (u.stats as Record<string, unknown> | undefined) ?? {};

  // Firebase Auth metadata (best-effort — the auth user may not exist).
  let authRecord: Awaited<ReturnType<typeof adminAuth.getUser>> | null = null;
  try {
    authRecord = await adminAuth.getUser(uid);
  } catch {
    authRecord = null;
  }
  const providers =
    authRecord?.providerData.map(
      (p) => PROVIDER_LABELS[p.providerId] ?? p.providerId,
    ) ?? [];

  // Login/session records (sort + slice in memory — no composite index needed).
  const sessSnap = await adminDb
    .collection("userSessions")
    .where("uid", "==", uid)
    .get();
  const sessions = buildSessions(sessSnap.docs);
  const recent = sessions.slice(0, 25);
  const activeCount = sessions.filter((s) => s.active).length;
  const lastIp = sessions[0]?.ip ?? null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/users"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back to users
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="font-display text-3xl tracking-[3px] mb-1">
            {String(u.firstName ?? "")} {String(u.lastName ?? "")}
          </h1>
          <p className="text-text-muted">@{String(u.displayName ?? "")}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {u.isAdmin && <Badge tone="pro">admin</Badge>}
            {u.role === "host" && u.hostStatus === "approved" && (
              <Badge tone="host">host</Badge>
            )}
            {u.hostStatus === "pending" && (
              <Badge tone="pending">host pending</Badge>
            )}
            {u.teamId && <Badge tone="neutral">on team</Badge>}
            {u.archived && <Badge tone="neutral">archived</Badge>}
            {authRecord?.disabled && <Badge tone="neutral">disabled</Badge>}
          </div>
        </div>
      </div>

      {/* Contact */}
      <h2 className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
        Contact
      </h2>
      <Card className="mb-6">
        <div className="grid sm:grid-cols-2 gap-4 p-5 text-sm">
          <Field label="Email" value={String(u.email ?? "")} />
          <Field label="Email verified" value={u.emailVerified ? "Yes" : "No"} />
          <Field
            label="Phone"
            value={u.phone ? formatStoredUsPhone(String(u.phone)) : "—"}
          />
          <Field label="Phone verified" value={u.phoneVerified ? "Yes" : "No"} />
          <Field label="Username" value={`@${String(u.displayName ?? "")}`} />
          <Field label="User ID" value={uid} />
        </div>
      </Card>

      {/* Account */}
      <h2 className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
        Account
      </h2>
      <Card className="mb-6">
        <div className="grid sm:grid-cols-2 gap-4 p-5 text-sm">
          <Field label="Role" value={String(u.role ?? "player")} />
          <Field label="Host status" value={String(u.hostStatus ?? "none")} />
          <Field label="Admin" value={u.isAdmin ? "Yes" : "No"} />
          <Field label="Team" value={(u.teamId as string | null) ?? "—"} />
          <Field
            label="Teams joined (history)"
            value={String(
              ((u.teamHistory as string[] | undefined) ?? []).length,
            )}
          />
          <Field label="Sign-in methods" value={providers.join(", ") || "—"} />
          <Field label="Joined" value={fmtDate(tsToMs(u.createdAt))} />
          <Field label="Last updated" value={fmtDateTime(tsToMs(u.updatedAt))} />
          <Field
            label="Account created (auth)"
            value={fmtIso(authRecord?.metadata.creationTime)}
          />
          <Field
            label="Last sign-in (auth)"
            value={fmtIso(authRecord?.metadata.lastSignInTime)}
          />
          <Field
            label="Deletion requested"
            value={fmtDateTime(tsToMs(u.deletionRequestedAt))}
          />
          <Field
            label="Archived"
            value={u.archived ? fmtDateTime(tsToMs(u.archivedAt)) : "No"}
          />
        </div>
      </Card>

      {/* Stats */}
      <h2 className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
        Stats
      </h2>
      <Card className="mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
          <Stat label="Games" value={Number(stats.gamesPlayed ?? 0)} />
          <Stat label="Wins" value={Number(stats.gamesWon ?? 0)} />
          <Stat label="Best score" value={Number(stats.highestScore ?? 0)} />
          <Stat
            label="Longest streak"
            value={Number(stats.longestWinStreak ?? 0)}
          />
          <Stat
            label="Correct answers"
            value={Number(stats.totalCorrectAnswers ?? 0)}
          />
          <Stat
            label="Questions answered"
            value={Number(stats.totalQuestionsAnswered ?? 0)}
          />
          <Stat
            label="Current streak"
            value={Number(stats.currentWinStreak ?? 0)}
          />
          <Stat
            label="Venues visited"
            value={((stats.venues as unknown[] | undefined) ?? []).length}
          />
        </div>
      </Card>

      {/* Security & sessions */}
      <h2 className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
        Security &amp; sessions
      </h2>
      <Card className="mb-6">
        <div className="p-5 flex flex-col gap-4">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <Field label="Last IP" value={lastIp ?? "—"} />
            <Field label="Active sessions" value={String(activeCount)} />
          </div>

          {recent.length === 0 ? (
            <p className="text-sm text-text-faint">
              No logins recorded yet. Login tracking applies going forward.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-[2px] text-text-faint">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">IP</th>
                    <th className="py-2 pr-4">Device</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-line">
                  {recent.map((s, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 text-text-muted whitespace-nowrap">
                        {fmtDateTime(s.createdAt)}
                      </td>
                      <td className="py-2 pr-4 text-text-primary whitespace-nowrap">
                        {s.ip}
                      </td>
                      <td
                        className="py-2 pr-4 text-text-faint max-w-[18rem] truncate"
                        title={s.userAgent}
                      >
                        {s.userAgent || "—"}
                      </td>
                      <td className="py-2">
                        {s.active ? (
                          <span className="text-game-green">active</span>
                        ) : s.endedAt ? (
                          <span className="text-text-faint">signed out</span>
                        ) : (
                          <span className="text-text-faint">expired</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-brand-line pt-4">
            <SignOutEverywhereButton
              uid={uid}
              displayName={String(u.displayName ?? "")}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[3px] text-text-faint mb-1">
        {label}
      </div>
      <div className="text-text-primary break-words">{value || "—"}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-3xl">{value}</div>
      <div className="text-xs uppercase tracking-[3px] text-text-faint mt-1">
        {label}
      </div>
    </div>
  );
}
