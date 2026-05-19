"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  success?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, success, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const errorId = error ? `${inputId}-err` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
          className={cn(
            "h-11 px-4 rounded-md bg-brand-ink border border-brand-line text-text-primary",
            "placeholder:text-text-faint",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red",
            "aria-[invalid=true]:border-game-red aria-[invalid=true]:ring-game-red",
            success &&
              !error &&
              "border-game-green focus-visible:border-game-green focus-visible:ring-game-green",
            "transition",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-faint">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-game-red">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
