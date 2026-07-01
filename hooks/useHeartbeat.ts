"use client";

import { useEffect } from "react";
import { HEARTBEAT_MS } from "@/lib/games/captain";

/**
 * Pings the session's presence endpoint on an interval while mounted, so
 * teammates can tell who's currently live (drives captain-takeover routing).
 * Pass `enabled: false` to pause (e.g. watch-only demos).
 */
export function useHeartbeat(sessionId: string, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const ping = () => {
      if (cancelled) return;
      void fetch(`/api/sessions/${sessionId}/heartbeat`, {
        method: "POST",
        keepalive: true,
      }).catch(() => {
        // Transient — the next tick will retry.
      });
    };

    ping();
    const timer = setInterval(ping, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sessionId, enabled]);
}
