"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Renders seconds remaining until `deadline` (epoch ms). Displays "—" when
 * deadline is null. Visually warns under 5s and shows "TIME'S UP" once expired.
 */
export function Countdown({
  deadline,
  className,
}: {
  deadline: number | null;
  className?: string;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [deadline]);

  if (deadline === null) {
    return (
      <span className={cn("text-text-faint", className)} aria-label="No timer">
        —
      </span>
    );
  }

  const remainingMs = deadline - now;
  const expired = remainingMs <= 0;
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));

  if (expired) {
    return (
      <span
        className={cn("font-display tracking-[3px] text-game-red", className)}
        role="status"
      >
        TIME&rsquo;S UP
      </span>
    );
  }

  const warning = seconds <= 5;
  return (
    <span
      className={cn(
        "font-display tabular-nums",
        warning ? "text-game-red animate-pulse" : "text-text-primary",
        className,
      )}
      aria-label={`${seconds} seconds remaining`}
      role="timer"
    >
      {seconds}s
    </span>
  );
}
