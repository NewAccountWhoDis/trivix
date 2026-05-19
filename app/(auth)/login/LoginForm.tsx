"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { PhoneAuthForm } from "@/components/auth/PhoneAuthForm";
import {
  getIdToken,
  signInWithEmail,
  signInWithGoogle,
} from "@/lib/auth/client";
import {
  formatGoogleSignInRequiredMessage,
  formatLinkRequiredMessage,
} from "@/lib/auth/messages";
import { linkPendingGoogleCredential } from "@/lib/auth/provider-linking";
import { loginSchema } from "@/lib/validation/schemas";

type PendingLink = {
  kind: "link-required";
  email: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingCred: any;
} | null;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingLink, setPendingLink] = useState<PendingLink>(null);

  async function exchangeForSession() {
    const idToken = await getIdToken(true);
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) throw new Error("Failed to mint session.");
  }

  function mapAuthError(err: unknown): string {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          return "Email or password is incorrect.";
        case "auth/too-many-requests":
          return "Too many attempts. Try again in a moment.";
        case "auth/network-request-failed":
          return "Network problem. Check your connection.";
        case "auth/operation-not-allowed":
          return formatGoogleSignInRequiredMessage(email);
        default:
          return "Sign-in failed. Please try again.";
      }
    }
    return "Sign-in failed. Please try again.";
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError("Enter a valid email and password.");
      return;
    }
    setSubmitting(true);
    try {
      if (pendingLink) {
        await linkPendingGoogleCredential({
          email: pendingLink.email,
          password,
          pendingCred: pendingLink.pendingCred,
        });
      } else {
        await signInWithEmail(parsed.data);
      }
      await exchangeForSession();
      router.push(next);
    } catch (err) {
      setError(mapAuthError(err));
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
        setPendingLink(result);
        setEmail(result.email);
        setError(formatLinkRequiredMessage(result.email));
        return;
      }
      await exchangeForSession();
      router.push(next);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">SIGN IN</h1>
      <p className="text-text-muted mb-8">
        New here?{" "}
        <Link href="/signup" className="text-brand-red hover:underline">
          Create an account
        </Link>
      </p>

      {mode === "phone" ? (
        <PhoneAuthForm
          recaptchaContainerId="login-recaptcha-container"
          onAuthed={async () => {
            await exchangeForSession();
            router.push(next);
          }}
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

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label={pendingLink ? "Confirm your password" : "Password"}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {submitting
                ? "Signing in…"
                : pendingLink
                  ? "Sign in & link Google"
                  : "Sign in"}
            </Button>

            <Link
              href="/forgot-password"
              className="text-sm text-text-muted hover:text-text-primary self-end"
            >
              Forgot password?
            </Link>
          </form>
        </>
      )}
    </div>
  );
}
