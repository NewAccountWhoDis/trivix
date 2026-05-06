"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  confirmPasswordReset,
  verifyPasswordResetCode,
} from "firebase/auth";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { firebaseAuth } from "@/lib/firebase/client";
import { passwordSchema } from "@/lib/validation/schemas";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const oobCode = params.get("oobCode");

  const [verifying, setVerifying] = useState(true);
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!oobCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinkError("This reset link is missing required info.");
      setVerifying(false);
      return;
    }
    verifyPasswordResetCode(firebaseAuth, oobCode)
      .then((email) => setVerifiedEmail(email))
      .catch(() =>
        setLinkError("This reset link is invalid or has expired."),
      )
      .finally(() => setVerifying(false));
  }, [oobCode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!oobCode) return;
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setSubmitError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setSubmitError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(firebaseAuth, oobCode, password);
      setDone(true);
    } catch {
      setSubmitError("Couldn't reset your password. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (verifying) {
    return (
      <div>
        <h1 className="font-display text-4xl tracking-[3px] mb-2">RESET PASSWORD</h1>
        <p className="text-text-muted">Checking your link…</p>
      </div>
    );
  }

  if (linkError) {
    return (
      <div>
        <h1 className="font-display text-4xl tracking-[3px] mb-2">LINK EXPIRED</h1>
        <p className="text-text-muted mb-6">{linkError}</p>
        <Link
          href="/forgot-password"
          className="text-brand-red hover:underline"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <h1 className="font-display text-4xl tracking-[3px] mb-2">DONE</h1>
        <p className="text-text-muted mb-6">
          Your password is reset. Sign in with your new password.
        </p>
        <Link href="/login">
          <Button size="lg">Go to sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">NEW PASSWORD</h1>
      <p className="text-text-muted mb-8">
        Resetting password for <strong>{verifiedEmail}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters"
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {submitError && (
          <div
            role="alert"
            className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
          >
            {submitError}
          </div>
        )}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Saving…" : "Reset password"}
        </Button>
      </form>
    </div>
  );
}
