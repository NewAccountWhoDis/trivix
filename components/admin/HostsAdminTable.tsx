"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export interface SubHostRow {
  uid: string;
  displayName: string;
  email: string;
}

export interface MainHostRow {
  uid: string;
  displayName: string;
  email: string;
  hostExpiresAt: number | null;
  subHostCap: number;
  subHosts: SubHostRow[];
  orphan?: boolean;
}

function fmtDate(ms: number | null): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

function toInputDate(ms: number | null): string {
  if (!ms) return "";
  return new Date(ms).toISOString().slice(0, 10);
}

export function HostsAdminTable({ rows }: { rows: MainHostRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r) => (
        <HostRow key={r.uid} row={r} />
      ))}
    </div>
  );
}

function HostRow({ row }: { row: MainHostRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [expires, setExpires] = useState(toInputDate(row.hostExpiresAt));
  const [cap, setCap] = useState(row.subHostCap);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      payload.hostExpiresAt = expires || null;
      payload.subHostCap = cap;
      const res = await fetch(`/api/admin/hosts/${row.uid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Update failed");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeSub(subUid: string) {
    if (!confirm("Remove this sub-host?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/host/sub-hosts/${subUid}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Remove failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="font-display text-xl tracking-[2px] truncate">
              @{row.displayName}
            </div>
            <div className="text-xs text-text-faint mt-1 truncate">
              {row.email}
            </div>
          </div>
          {!row.orphan && !editing && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
            >
              Edit
            </Button>
          )}
        </div>

        {!editing && !row.orphan && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
            <Stat label="Expires" value={fmtDate(row.hostExpiresAt)} />
            <Stat
              label="Sub-hosts"
              value={`${row.subHosts.length} / ${row.subHostCap}`}
            />
          </div>
        )}

        {editing && (
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Expires"
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
            />
            <Input
              label="Max sub-hosts"
              type="number"
              min={0}
              max={100}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value || 0))}
            />
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-3 text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
          >
            {error}
          </div>
        )}

        {editing && (
          <div className="flex gap-2 justify-end mt-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setExpires(toInputDate(row.hostExpiresAt));
                setCap(row.subHostCap);
                setError(null);
              }}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        )}

        {row.subHosts.length > 0 && (
          <div className="mt-5 border-t border-brand-line pt-4">
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Sub-hosts
            </div>
            <ul className="flex flex-col gap-2">
              {row.subHosts.map((s) => (
                <li
                  key={s.uid}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-sm truncate">
                    @{s.displayName}{" "}
                    <span className="text-text-faint">· {s.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSub(s.uid)}
                    disabled={busy}
                    className="text-xs text-text-muted hover:text-game-red transition px-2 py-1 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[3px] text-text-faint mb-1">
        {label}
      </div>
      <div className="text-text-primary">{value}</div>
    </div>
  );
}
