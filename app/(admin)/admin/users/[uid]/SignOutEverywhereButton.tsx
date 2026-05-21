"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";

export function SignOutEverywhereButton({
  uid,
  displayName,
}: {
  uid: string;
  displayName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signout-everywhere" }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Action failed");
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <ConfirmDestructive
        trigger={
          <Button size="sm" variant="secondary" disabled={busy}>
            Sign out everywhere
          </Button>
        }
        title="Sign out everywhere"
        description={`Revoke all of @${displayName}'s sessions. They'll need to log in again on every device. Use this if the account looks compromised.`}
        confirmPhrase={displayName}
        actionLabel="Sign out everywhere"
        onConfirm={run}
      />
      {done && <span className="text-sm text-game-green">Sessions revoked.</span>}
      {error && <span className="text-sm text-game-red">{error}</span>}
    </div>
  );
}
