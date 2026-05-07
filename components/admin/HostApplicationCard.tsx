"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";

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

  async function act(action: "approve" | "deny") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/host-applications/${app.uid}`, {
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
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={() => act("approve")} disabled={busy}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => act("deny")}
              disabled={busy}
            >
              Deny
            </Button>
          </div>
        </div>
        {app.reason && (
          <p className="text-sm text-text-muted whitespace-pre-wrap">
            {app.reason}
          </p>
        )}
        {error && (
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
