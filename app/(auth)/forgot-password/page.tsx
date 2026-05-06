"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { sendPasswordReset } from "@/lib/auth/client";
import { forgotPasswordSchema } from "@/lib/validation/schemas";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(parsed.data.email);
      setSent(true);
    } catch {
      // Don't leak whether the email exists.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">RESET PASSWORD</h1>
      <p className="text-text-muted mb-8">
        Enter your email and we&apos;ll send a reset link.
      </p>

      {sent ? (
        <div className="bg-brand-ink border border-brand-line rounded-md p-4 text-sm text-text-muted">
          If an account exists for <strong>{email}</strong>, a reset link is on
          its way. Check your inbox.
          <div className="mt-4">
            <Link href="/login" className="text-brand-red hover:underline">
              Back to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && (
            <div
              role="alert"
              className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          <Link
            href="/login"
            className="text-sm text-text-muted hover:text-text-primary self-end"
          >
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
