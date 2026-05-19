"use client";

import { useEffect, useState } from "react";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import {
  clearRecaptcha,
  confirmPhoneCode,
  sendPhoneCode,
  type ConfirmationResult,
} from "@/lib/auth/client";

function formatUsPhone(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return "+1 ";
  if (d.length <= 3) return `+1 (${d}`;
  if (d.length <= 6) return `+1 (${d.slice(0, 3)}) ${d.slice(3)}`;
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function extractPhoneDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (raw.trimStart().startsWith("+1")) {
    if (digits.startsWith("1")) digits = digits.slice(1);
  } else if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function PhoneAuthForm({
  recaptchaContainerId,
  onAuthed,
  onCancel,
}: {
  recaptchaContainerId: string;
  onAuthed: () => void | Promise<void>;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<"number" | "code">("number");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (phoneDigits.length !== 10) {
      setError("Enter a 10-digit US phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const c = await sendPhoneCode(`+1${phoneDigits}`, recaptchaContainerId);
      setConfirmation(c);
      setPhase("code");
    } catch (err) {
      const fcode = err instanceof FirebaseError ? err.code : "";
      if (fcode === "auth/invalid-phone-number") {
        setError("That phone number looks invalid.");
      } else if (fcode === "auth/too-many-requests") {
        setError("Too many attempts. Wait a moment and try again.");
      } else {
        setError("Couldn't send code. Please try again.");
      }
      clearRecaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirmation) {
      setError("Session expired. Resend the code.");
      setPhase("number");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setSubmitting(true);
    try {
      await confirmPhoneCode(confirmation, code);
      await onAuthed();
    } catch (err) {
      const fcode = err instanceof FirebaseError ? err.code : "";
      if (fcode === "auth/invalid-verification-code") {
        setError("Wrong code. Try again.");
      } else if (fcode === "auth/code-expired") {
        setError("Code expired. Resend a new one.");
        setPhase("number");
      } else {
        setError("Couldn't verify. Try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {phase === "number" ? (
        <form onSubmit={handleSend} className="flex flex-col gap-4">
          <Input
            label="Phone number"
            type="tel"
            autoComplete="tel-national"
            inputMode="numeric"
            value={formatUsPhone(phoneDigits)}
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
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
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
              {submitting ? "Sending…" : "Send code"}
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleConfirm} className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Code sent to {formatUsPhone(phoneDigits)}.
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
                setConfirmation(null);
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
              {submitting ? "Verifying…" : "Verify"}
            </Button>
          </div>
        </form>
      )}
      <div id={recaptchaContainerId} />
    </div>
  );
}
