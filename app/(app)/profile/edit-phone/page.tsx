"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import {
  clearRecaptcha,
  confirmPhoneUpdate,
  getIdToken,
  startPhoneUpdate,
} from "@/lib/auth/client";
import { extractPhoneDigits, formatUsPhoneDigits } from "@/lib/utils/phone";

const RECAPTCHA_ID = "edit-phone-recaptcha";

export default function EditPhonePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"number" | "code">("number");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  function mapErr(err: unknown): string {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/invalid-phone-number":
          return "That phone number looks invalid.";
        case "auth/too-many-requests":
          return "Too many attempts. Wait a moment and try again.";
        case "auth/invalid-verification-code":
          return "Wrong code. Try again.";
        case "auth/code-expired":
          return "Code expired. Send a new one.";
        case "auth/credential-already-in-use":
        case "auth/account-exists-with-different-credential":
          return "That phone number is already used by another account.";
        case "auth/requires-recent-login":
          return "Sign in again, then retry.";
        default:
          return "Something went wrong. Please try again.";
      }
    }
    return "Something went wrong. Please try again.";
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (phoneDigits.length !== 10) {
      setError("Enter a 10-digit US phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const id = await startPhoneUpdate(`+1${phoneDigits}`, RECAPTCHA_ID);
      setVerificationId(id);
      setPhase("code");
    } catch (err) {
      setError(mapErr(err));
      clearRecaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!verificationId) {
      setError("Session expired. Start over.");
      setPhase("number");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPhoneUpdate(verificationId, code);
      const idToken = await getIdToken(true);
      const res = await fetch("/api/profile/phone", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Update failed");
      }
      router.push("/profile");
      router.refresh();
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(mapErr(err));
      } else {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-md mx-auto">
      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        UPDATE PHONE
      </h1>
      <p className="text-text-muted mb-8">
        We&apos;ll send a code to your new number to confirm it&apos;s yours.
      </p>

      {phase === "number" ? (
        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <Input
            label="New phone number"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            value={formatUsPhoneDigits(phoneDigits)}
            onChange={(e) => setPhoneDigits(extractPhoneDigits(e.target.value))}
            hint="US numbers only"
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
            <Button type="button" variant="ghost" asChild>
              <Link href="/profile">Cancel</Link>
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? "Sending…" : "Send code"}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Code sent to {formatUsPhoneDigits(phoneDigits)}.
          </p>
          <Input
            label="6-digit code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
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
              onClick={() => {
                setPhase("number");
                setCode("");
                setVerificationId(null);
                clearRecaptcha();
              }}
              disabled={submitting}
            >
              Change number
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? "Saving…" : "Verify & save"}
            </Button>
          </div>
        </form>
      )}

      <div id={RECAPTCHA_ID} />
    </main>
  );
}
