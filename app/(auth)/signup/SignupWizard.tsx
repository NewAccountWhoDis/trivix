"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import {
  getIdToken,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth/client";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import { useAuth } from "@/hooks/useAuth";
import {
  signupStep1EmailSchema,
  signupStep2Schema,
  signupStep3Schema,
} from "@/lib/validation/schemas";

type Step = 1 | 2 | 3;

interface Step2Data {
  firstName: string;
  lastName: string;
  displayName: string;
}

interface Step3Data {
  role: "player" | "host";
  reason: string;
}

export function SignupWizard() {
  const router = useRouter();
  const params = useSearchParams();
  const rawStep = Number(params.get("step") ?? "1");
  const step = ([1, 2, 3].includes(rawStep) ? rawStep : 1) as Step;
  const intent = params.get("intent");
  const { user: firebaseUser } = useAuth();

  const [step2, setStep2] = useState<Step2Data>({
    firstName: "",
    lastName: "",
    displayName: "",
  });
  const [step3, setStep3] = useState<Step3Data>({
    role: intent === "host" ? "host" : "player",
    reason: "",
  });

  const goTo = useCallback(
    (n: Step) => {
      const url = new URL(window.location.href);
      url.searchParams.set("step", String(n));
      router.push(`${url.pathname}${url.search}`);
    },
    [router],
  );

  return (
    <div>
      <StepIndicator current={step} />
      {step === 1 && (
        <Step1Account
          onAuthed={() => goTo(2)}
          alreadyAuthed={Boolean(firebaseUser)}
        />
      )}
      {step === 2 && (
        <Step2Identity
          value={step2}
          onChange={setStep2}
          onNext={() => goTo(3)}
          onBack={() => goTo(1)}
        />
      )}
      {step === 3 && (
        <Step3Role
          value={step3}
          onChange={setStep3}
          step2={step2}
          onComplete={() => router.push("/dashboard")}
          onBack={() => goTo(2)}
        />
      )}
    </div>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const labels = useMemo(
    () => ["Account", "Identity", "Role"] as const,
    [],
  );
  return (
    <div className="flex items-center gap-2 mb-8">
      {labels.map((label, i) => {
        const n = (i + 1) as Step;
        const active = current === n;
        const done = current > n;
        return (
          <div key={label} className="flex items-center gap-2 flex-1">
            <span
              className={`h-1 flex-1 rounded-full ${
                done || active ? "bg-brand-red" : "bg-brand-line"
              }`}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 ──────────────────────────────────────────────────────────────────
function Step1Account({
  onAuthed,
  alreadyAuthed,
}: {
  onAuthed: () => void;
  alreadyAuthed: boolean;
}) {
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function mapErr(err: unknown): string {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/email-already-in-use":
          return "An account already exists for this email. Try signing in.";
        case "auth/weak-password":
          return "Use at least 8 characters.";
        case "auth/invalid-email":
          return "That email looks invalid.";
        default:
          return "Couldn't create account. Please try again.";
      }
    }
    return "Couldn't create account. Please try again.";
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = signupStep1EmailSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Enter a valid email and a password of at least 8 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await signUpWithEmail(parsed.data);
      onAuthed();
    } catch (err) {
      setError(mapErr(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setSubmitting(true);
    try {
      const result = await signInWithGoogle();
      if (result.kind === "link-required") {
        setError(
          `${result.email} is already registered. Sign in instead, then add Google from Settings.`,
        );
        return;
      }
      onAuthed();
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        CREATE ACCOUNT
      </h1>
      <p className="text-text-muted mb-8">
        Have one?{" "}
        <Link href="/login" className="text-brand-red hover:underline">
          Sign in
        </Link>
      </p>

      {alreadyAuthed && (
        <div className="text-sm text-text-muted bg-brand-ink border border-brand-line rounded-md px-3 py-2 mb-4">
          You&apos;re already signed in. Continue to the next step.
        </div>
      )}

      {mode === "phone" ? (
        <PhoneAuthForm
          recaptchaContainerId="recaptcha-container"
          onAuthed={onAuthed}
          onCancel={() => {
            setError(null);
            setMode("email");
          }}
        />
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="w-full"
              onClick={() => {
                setError(null);
                setMode("phone");
              }}
              disabled={submitting}
            >
              Continue with phone
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={handleGoogle}
              disabled={submitting}
            >
              Continue with Google
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3 text-text-faint text-xs uppercase tracking-[3px]">
            <span className="flex-1 h-px bg-brand-line" />
            or email and password
            <span className="flex-1 h-px bg-brand-line" />
          </div>

          <form onSubmit={handleEmail} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
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
            <Button
              type="submit"
              variant="secondary"
              size="lg"
              disabled={submitting}
            >
              {submitting ? "Creating…" : "Create account"}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}

// ── Step 2 ──────────────────────────────────────────────────────────────────
function Step2Identity({
  value,
  onChange,
  onNext,
  onBack,
}: {
  value: Step2Data;
  onChange: (v: Step2Data) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Debounced uniqueness check
  useEffect(() => {
    const dn = value.displayName.trim();
    setAvailable(null); // eslint-disable-line react-hooks/set-state-in-effect
    if (dn.length < 3) return;
    if (!/^[a-zA-Z0-9_]+$/.test(dn)) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setChecking(true);
      try {
        const res = await fetch("/api/profile/check-display-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: dn }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setAvailable(null);
          return;
        }
        const body = (await res.json()) as { available: boolean };
        setAvailable(body.available);
      } catch {
        // ignore aborts
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [value.displayName]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = signupStep2Schema.safeParse(value);
    if (!parsed.success) {
      setFormError("Fill in all fields with valid values.");
      return;
    }
    if (available === false) {
      setFormError("That username isn't available.");
      return;
    }
    if (available === null) {
      setFormError("Checking username availability…");
      return;
    }
    onNext();
  }

  const dnHint = !value.displayName
    ? "3–20 chars; letters, numbers, underscores"
    : checking
      ? "Checking availability…"
      : available === true
        ? "Available"
        : available === false
          ? "Username isn't available"
          : "3–20 chars; letters, numbers, underscores";

  const dnError = available === false ? "username isn't available" : undefined;

  return (
    <div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        YOUR IDENTITY
      </h1>
      <p className="text-text-muted mb-8">How should we know you?</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
            required
          />
          <Input
            label="Last name"
            value={value.lastName}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
            required
          />
        </div>
        <Input
          label="Username"
          value={value.displayName}
          onChange={(e) => onChange({ ...value, displayName: e.target.value })}
          hint={dnHint}
          error={dnError}
          required
        />
        {formError && (
          <div
            role="alert"
            className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
          >
            {formError}
          </div>
        )}
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onBack}>
            Back
          </Button>
          <Button type="submit" size="lg" className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Step 3 ──────────────────────────────────────────────────────────────────
function Step3Role({
  value,
  onChange,
  step2,
  onComplete,
  onBack,
}: {
  value: Step3Data;
  onChange: (v: Step3Data) => void;
  step2: Step2Data;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = signupStep3Schema.safeParse({
      role: value.role,
      reason: value.role === "host" ? value.reason || null : null,
    });
    if (!parsed.success) {
      setError("Choose a role.");
      return;
    }
    setSubmitting(true);
    try {
      const idToken = await getIdToken(true);
      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          firstName: step2.firstName,
          lastName: step2.lastName,
          displayName: step2.displayName,
          role: parsed.data.role,
          reason: parsed.data.reason,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Signup failed");
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">YOUR ROLE</h1>
      <p className="text-text-muted mb-8">How will you use Trivix?</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <RoleOption
          selected={value.role === "player"}
          onSelect={() => onChange({ ...value, role: "player" })}
          title="I want to play trivia"
          desc="Join a team, climb leaderboards, win bragging rights."
        />
        <RoleOption
          selected={value.role === "host"}
          onSelect={() => onChange({ ...value, role: "host" })}
          title="I want to host"
          desc="Run trivia nights at your venue. Requires admin approval."
        />

        {value.role === "host" && (
          <label className="flex flex-col gap-1.5 mt-2">
            <span className="text-sm font-medium text-text-muted">
              Tell us about your venue (optional)
            </span>
            <textarea
              value={value.reason}
              onChange={(e) => onChange({ ...value, reason: e.target.value })}
              maxLength={500}
              rows={4}
              className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition resize-none"
              placeholder="Where do you host? How often? Any prior experience?"
            />
          </label>
        )}

        {error && (
          <div
            role="alert"
            className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
          >
            {error}
          </div>
        )}

        <div className="flex gap-3 mt-2">
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
            {submitting ? "Creating profile…" : "Finish"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RoleOption({
  selected,
  onSelect,
  title,
  desc,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left w-full px-5 py-4 rounded-md border transition ${
        selected
          ? "border-brand-red bg-brand-red/10"
          : "border-brand-line bg-brand-ink hover:border-text-muted"
      }`}
    >
      <div className="font-medium text-text-primary">{title}</div>
      <div className="text-sm text-text-muted mt-1">{desc}</div>
    </button>
  );
}

