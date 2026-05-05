import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone =
  | "host"
  | "captain"
  | "pro"
  | "pending"
  | "neutral"
  | "success"
  | "error";

const tones: Record<Tone, string> = {
  host: "bg-brand-red/15 text-brand-red border-brand-red/40",
  captain: "bg-game-yellow/15 text-game-yellow border-game-yellow/40",
  pro: "bg-brand-red/15 text-brand-red border-brand-red/40",
  pending: "bg-game-blue/15 text-game-blue border-game-blue/40",
  neutral: "bg-brand-line text-text-muted border-brand-line",
  success: "bg-game-green/15 text-game-green border-game-green/40",
  error: "bg-game-red/15 text-game-red border-game-red/40",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full border",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
