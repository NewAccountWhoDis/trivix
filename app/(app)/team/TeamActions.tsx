"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function TeamActions({
  teamId,
  isCaptain,
  captainPresent,
}: {
  teamId: string;
  isCaptain: boolean;
  captainPresent: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: "POST" | "DELETE" = "POST") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Request failed");
      }
      router.push("/team");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {!isCaptain && !captainPresent && (
        <Button
          variant="secondary"
          onClick={() => call(`/api/teams/${teamId}/claim-captain`)}
          disabled={busy}
        >
          Claim captain
        </Button>
      )}
      <Button
        variant="ghost"
        onClick={() => {
          if (confirm("Leave this team?")) call(`/api/teams/${teamId}/leave`);
        }}
        disabled={busy}
      >
        Leave team
      </Button>
      {error && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2 w-full"
        >
          {error}
        </div>
      )}
    </div>
  );
}
