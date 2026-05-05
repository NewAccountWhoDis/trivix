"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "quad-r"
  | "quad-b"
  | "quad-y"
  | "quad-g";

type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-red text-brand-black hover:shadow-glow-red active:scale-[0.97] transition",
  secondary:
    "bg-brand-ink text-text-primary border border-brand-line hover:border-brand-red transition",
  ghost: "bg-transparent text-text-primary hover:bg-brand-ink transition",
  danger: "bg-game-red text-brand-black hover:shadow-glow-quad-r transition",
  "quad-r": "bg-game-red text-brand-black hover:shadow-glow-quad-r transition",
  "quad-b": "bg-game-blue text-brand-black hover:shadow-glow-quad-b transition",
  "quad-y":
    "bg-game-yellow text-brand-black hover:shadow-glow-quad-y transition",
  "quad-g":
    "bg-game-green text-brand-black hover:shadow-glow-quad-g transition",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-md",
  md: "h-11 px-5 text-base rounded-md",
  lg: "h-14 px-7 text-lg rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as never}
        className={cn(
          "inline-flex items-center justify-center font-semibold select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-brand-black",
          "disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
