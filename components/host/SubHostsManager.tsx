"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import {
  UserAutocomplete,
  type UserAutocompleteHit,
} from "@/components/admin/UserAutocomplete";

export interface SubHostEntry {
  uid: string;
  displayName: string;
  email: string;
}

export function SubHostsManager({
  subs,
  cap,
}: {
  subs: SubHostEntry[];
  cap: number;
}) {
  const router = useRouter();
  const [pick, setPick] = useState<UserAutocompleteHit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atCap = subs.length >= cap;

  async function add() {
    if (!pick) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/host/sub-hosts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: pick.uid }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Add failed");
      }
      setPick(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(uid: string) {
    if (!confirm("Remove this sub-host?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/host/sub-hosts/${uid}`, {
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
    <div className="flex flex-col gap-6">
      <Card>
        <div className="p-5 flex flex-col gap-3">
          <div className="text-sm font-medium text-text-muted">
            Add a sub-host
          </div>
          {atCap ? (
            <p className="text-sm text-text-faint">
              You&apos;re at your limit. Remove someone first or ask an admin
              to raise your cap.
            </p>
          ) : (
            <>
              <UserAutocomplete
                value={pick}
                onSelect={setPick}
                onClear={() => setPick(null)}
                placeholder="Search by username or email"
                hint="They must already have a Trivix account."
                filter={(h) => h.hostStatus !== "approved" || h.role !== "host"}
              />
              {error && (
                <div
                  role="alert"
                  className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
                >
                  {error}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={add}
                  disabled={!pick || busy}
                  size="sm"
                >
                  {busy ? "Adding…" : "Add sub-host"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-5">
          <div className="text-sm font-medium text-text-muted mb-3">
            Your sub-hosts
          </div>
          {subs.length === 0 ? (
            <p className="text-sm text-text-faint">No sub-hosts yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {subs.map((s) => (
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
                    onClick={() => remove(s.uid)}
                    disabled={busy}
                    className="text-xs text-text-muted hover:text-game-red transition px-2 py-1 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
