"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";
import { formatStoredUsPhone } from "@/lib/utils/phone";
import { cn } from "@/lib/utils/cn";

export interface AdminUserRow {
  uid: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  role: "player" | "host";
  hostStatus: "none" | "pending" | "approved" | "denied";
  isAdmin: boolean;
  teamId: string | null;
  archived: boolean;
  archivedAt: number | null;
  createdAt: number;
}

type View = "active" | "archived";

export function UsersTable({
  users,
  currentAdminUid,
}: {
  users: AdminUserRow[];
  currentAdminUid: string | null;
}) {
  const router = useRouter();
  const [view, setView] = useState<View>("active");
  const [query, setQuery] = useState("");
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = users.filter((u) =>
      view === "archived" ? u.archived : !u.archived,
    );
    if (!q) return filtered;
    return filtered.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, query, view]);

  const activeCount = users.filter((u) => !u.archived).length;
  const archivedCount = users.length - activeCount;

  async function act(uid: string, action: "revoke-host" | "delete") {
    setBusyUid(uid);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Action failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyUid(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView("active")}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition",
            view === "active"
              ? "bg-brand-ink text-text-primary border border-brand-line"
              : "text-text-muted hover:text-text-primary",
          )}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setView("archived")}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md transition",
            view === "archived"
              ? "bg-brand-ink text-text-primary border border-brand-line"
              : "text-text-muted hover:text-text-primary",
          )}
        >
          Archived ({archivedCount})
        </button>
      </div>

      <Input
        label="Search"
        placeholder="Filter by username or email"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}

      {view === "archived" ? (
        <ArchivedTable rows={visible} />
      ) : (
        <Card>
          <ul className="divide-y divide-brand-line">
            {visible.length === 0 && (
              <li className="p-5 text-text-muted text-sm">No users match.</li>
            )}
            {visible.map((u) => {
              const isSelf = u.uid === currentAdminUid;
              const canRevokeHost =
                u.role === "host" || u.hostStatus !== "none";
              return (
                <li
                  key={u.uid}
                  className="flex items-center gap-3 p-4 flex-wrap"
                >
                  <Link
                    href={`/admin/users/${u.uid}`}
                    className="flex-1 min-w-[10rem] group"
                  >
                    <div className="text-text-primary group-hover:text-brand-red transition">
                      @{u.displayName}
                    </div>
                    <div className="text-xs text-text-faint">{u.email}</div>
                  </Link>
                  <div className="flex flex-wrap gap-2">
                    {u.isAdmin && <Badge tone="pro">admin</Badge>}
                    {u.role === "host" && u.hostStatus === "approved" && (
                      <Badge tone="host">host</Badge>
                    )}
                    {u.hostStatus === "pending" && (
                      <Badge tone="pending">host pending</Badge>
                    )}
                    {u.teamId && <Badge tone="neutral">on team</Badge>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canRevokeHost && !isSelf && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyUid === u.uid}
                        onClick={() => act(u.uid, "revoke-host")}
                      >
                        Revoke host
                      </Button>
                    )}
                    {!isSelf && (
                      <ConfirmDestructive
                        trigger={
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busyUid === u.uid}
                          >
                            Delete
                          </Button>
                        }
                        title="Delete user"
                        description={`Permanently remove @${u.displayName} and their auth account. If they're on a team, they'll be removed cleanly.`}
                        confirmPhrase={u.displayName}
                        actionLabel="Delete user"
                        onConfirm={() => act(u.uid, "delete")}
                      />
                    )}
                    {isSelf && (
                      <span className="text-xs text-text-faint italic">
                        that&apos;s you
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function ArchivedTable({ rows }: { rows: AdminUserRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="p-5 text-text-muted text-sm">
          No archived accounts.
        </div>
      </Card>
    );
  }
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[3px] text-text-faint">
              <th className="px-5 py-3">Name</th>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Phone</th>
              <th className="px-5 py-3">Joined</th>
              <th className="px-5 py-3">Deleted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-line">
            {rows.map((u) => (
              <tr key={u.uid}>
                <td className="px-5 py-3 text-text-primary">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-5 py-3 text-text-muted">
                  <Link
                    href={`/admin/users/${u.uid}`}
                    className="hover:text-brand-red transition"
                  >
                    @{u.displayName}
                  </Link>
                </td>
                <td className="px-5 py-3 text-text-muted">{u.email}</td>
                <td className="px-5 py-3 text-text-muted">
                  {u.phone ? formatStoredUsPhone(u.phone) : "—"}
                </td>
                <td className="px-5 py-3 text-text-muted">
                  {u.createdAt
                    ? new Date(u.createdAt).toLocaleDateString()
                    : "—"}
                </td>
                <td className="px-5 py-3 text-text-muted">
                  {u.archivedAt
                    ? new Date(u.archivedAt).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
