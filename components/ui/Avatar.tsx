"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { seedToGradient, initialsFor } from "@/lib/avatar/seed";

type Size = "xs" | "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 text-2xl",
};

export interface AvatarProps {
  seed: string;
  firstName?: string;
  lastName?: string;
  size?: Size;
  className?: string;
}

export function Avatar({
  seed,
  firstName = "",
  lastName = "",
  size = "md",
  className,
}: AvatarProps) {
  const g = seedToGradient(seed);
  const initials = initialsFor(firstName, lastName);
  return (
    <div
      role="img"
      aria-label={
        firstName || lastName
          ? `${firstName} ${lastName}`.trim()
          : "User avatar"
      }
      className={cn(
        "rounded-full inline-flex items-center justify-center font-semibold select-none",
        sizes[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(160deg, ${g.from}, ${g.to})`,
        color: g.text,
      }}
    >
      {initials}
    </div>
  );
}
