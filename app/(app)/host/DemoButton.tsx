"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Spins up a flagged demo session and drops the host into the live dashboard.
 * Lives in the host nav next to "Start a game →".
 */
export function DemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function startDemo() {
    setBusy(true);
    try {
      const res = await fetch("/api/sessions/demo", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        sessionId?: string;
        error?: string;
      };
      if (!res.ok || !body.sessionId) {
        throw new Error(body.error ?? "Could not start demo");
      }
      router.push(`/host/sessions/${body.sessionId}`);
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startDemo}
      disabled={busy}
      className="px-3 py-1 rounded-md text-text-muted hover:text-text-primary transition disabled:opacity-50"
    >
      {busy ? "Starting demo…" : "▶ Try a demo"}
    </button>
  );
}
