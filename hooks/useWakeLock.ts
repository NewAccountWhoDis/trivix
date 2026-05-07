"use client";

import { useEffect } from "react";

interface WakeLockSentinel {
  release: () => Promise<void>;
  addEventListener: (type: "release", listener: () => void) => void;
  removeEventListener: (type: "release", listener: () => void) => void;
}

interface WakeLockNavigator {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
}

/**
 * Holds a screen wake lock while `active` is true. Re-requests after the
 * page becomes visible again (the browser releases the lock when the tab
 * is hidden). Silent no-op on browsers without the Wake Lock API.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined") return;
    const nav = navigator as Navigator & WakeLockNavigator;
    if (!nav.wakeLock) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire(): Promise<void> {
      if (cancelled || document.visibilityState !== "visible") return;
      try {
        const lock = await nav.wakeLock!.request("screen");
        if (cancelled) {
          await lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
      } catch {
        // request can reject if the page isn't visible or permission denied;
        // both are acceptable failure modes for a presenter screen.
      }
    }

    function onVisibility(): void {
      if (document.visibilityState === "visible" && !sentinel) {
        void acquire();
      }
    }

    document.addEventListener("visibilitychange", onVisibility);
    void acquire();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) {
        sentinel.release().catch(() => {});
        sentinel = null;
      }
    };
  }, [active]);
}
