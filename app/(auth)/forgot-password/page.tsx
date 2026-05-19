"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import {
  getIdToken,
  sendPasswordReset,
  updateCurrentUserPassword,
} from "@/lib/auth/client";
import {
  emailSchema,
  passwordSchema,
} from "@/lib/validation/schemas";

type Method = "choose" | "email" | "sms";

export default function ForgotPasswordPage() {
  const [method, setMethod] = useState<Method>("choose");

  return (
    <div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        RESET PASSWORD
      </h1>

      {method === "choose" && (
        <>
          <p className="text-text-muted mb-8">
            How would you like to reset it?
          </p>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => setMethod("email")}
            >
              Email me a reset link
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => setMethod("sms")}
            >
              Text me a code
            </Button>
            <Link
              href="/login"
              className="text-sm text-text-muted hover:text-text-primary self-end mt-2"
            >
              Back to sign in
            </Link>
          </div>
        </>
      )}

      {method === "email" && <EmailReset onBack={() => setMethod("choose")} />}
      {method === "sms" && <SmsReset onBack={() => setMethod("choose")} />}
    </div>
  );
}

function EmailReset({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError("Enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      await sendPasswordReset(parsed.data);
      setSent(true);
    } catch {
      // Don't leak whether the email exists.
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="bg-brand-ink border border-brand-line rounded-md p-4 text-sm text-text-muted">
        If an account exists for <strong>{email}</strong>, a reset link is on
        its way. Check your inbox.
        <div className="mt-4">
          <Link href="/login" className="text-brand-red hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-text-muted mb-8">
        Enter your email and we&apos;ll send a reset link.
      </p>
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
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={submitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            size="lg"
            className="flex-1"
            disabled={submitting}
          >
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
        </div>
      </form>
    </>
  );
}

function SmsReset({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"phone" | "newPassword">("phone");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exchangeForSession() {
    const idToken = await getIdToken(true);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Failed to start session.");
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      setError("Pick a password of at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await updateCurrentUserPassword(parsed.data);
      await exchangeForSession();
      router.push("/dashboard");
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        err.code === "auth/requires-recent-login"
      ) {
        setError("Please verify your phone again.");
        setPhase("phone");
      } else {
        setError("Couldn't update your password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "phone") {
    return (
      <>
        <p className="text-text-muted mb-8">
          We&apos;ll text a code to your registered number.
        </p>
        <PhoneAuthForm
          recaptchaContainerId="reset-recaptcha-container"
          onAuthed={() => setPhase("newPassword")}
          onCancel={onBack}
        />
      </>
    );
  }

  return (
    <>
      <p className="text-text-muted mb-8">
        Phone verified. Set a new password to finish.
      </p>
      <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters"
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
          {submitting ? "Saving…" : "Save password"}
        </Button>
      </form>
    </>
  );
}
