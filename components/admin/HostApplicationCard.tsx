"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";
import {
  UserAutocomplete,
  type UserAutocompleteHit,
} from "@/components/admin/UserAutocomplete";

export interface HostApplicationRow {
  uid: string;
  email: string;
  displayName: string;
  reason: string | null;
  appliedAt: number;
}

export function HostApplicationCard({ app }: { app: HostApplicationRow }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"idle" | "approve">("idle");

  // Approve-as-main fields:
  const [mainHost, setMainHost] = useState<UserAutocompleteHit | null>(null);
  const [expiresAt, setExpiresAt] = useState<string>(defaultExpiry());
  const [subHostCap, setSubHostCap] = useState<number>(0);

  function defaultExpiry(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  async function deny() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/host-applications/${app.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deny" }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Action failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setBusy(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/admin/host-applications/${app.uid}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error ?? "Delete failed");
    }
    router.refresh();
  }

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = { action: "approve" };
      if (mainHost) {
        payload.mainHostUid = mainHost.uid;
      } else {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
          setError("Pick an expiration date.");
          setBusy(false);
          return;
        }
        payload.hostExpiresAt = expiresAt;
        payload.subHostCap = subHostCap;
      }
      const res = await fetch(`/api/admin/host-applications/${app.uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Action failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setBusy(false);
    }
  }

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="font-display text-xl tracking-[2px]">
              @{app.displayName}
            </div>
            <div className="text-xs text-text-faint mt-1">
              {app.email} · applied{" "}
              {app.appliedAt
                ? new Date(app.appliedAt).toLocaleDateString()
                : "—"}
            </div>
          </div>
          {mode === "idle" && (
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => setMode("approve")}
                disabled={busy}
              >
                Approve…
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={deny}
                disabled={busy}
              >
                Deny
              </Button>
              <ConfirmDestructive
                trigger={
                  <Button size="sm" variant="danger" disabled={busy}>
                    Delete
                  </Button>
                }
                title="Delete host application"
                description={`Permanently remove @${app.displayName}'s application. The user will be reset to a player and can re-apply.`}
                confirmPhrase={`@${app.displayName}`}
                actionLabel="Delete application"
                onConfirm={handleDelete}
              />
            </div>
          )}
        </div>
        {app.reason && (
          <p className="text-sm text-text-muted whitespace-pre-wrap mb-3">
            {app.reason}
          </p>
        )}

        {mode === "approve" && (
          <div className="border-t border-brand-line pt-4 mt-3 flex flex-col gap-4">
            <UserAutocomplete
              label="Main host account (optional)"
              hint="Leave blank to approve as a new main host."
              value={mainHost}
              onSelect={setMainHost}
              onClear={() => setMainHost(null)}
              filter={(h) =>
                h.role === "host" &&
                h.hostStatus === "approved" &&
                h.mainHostUid === null
              }
            />

            {!mainHost && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Account expiration"
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  hint="Host status auto-expires after this date."
                  required
                />
                <Input
                  label="Max sub-hosts"
                  type="number"
                  min={0}
                  max={100}
                  value={subHostCap}
                  onChange={(e) =>
                    setSubHostCap(Number(e.target.value || 0))
                  }
                  hint="How many sub-hosts they can manage."
                />
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
              >
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setMode("idle");
                  setError(null);
                  setMainHost(null);
                }}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={approve} disabled={busy}>
                {busy
                  ? "Approving…"
                  : mainHost
                    ? "Approve as sub-host"
                    : "Approve as main host"}
              </Button>
            </div>
          </div>
        )}

        {mode === "idle" && error && (
          <div
            role="alert"
            className="mt-3 text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
          >
            {error}
          </div>
        )}
      </div>
    </Card>
  );
}
