"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { getIdToken, signInWithEmail } from "@/lib/auth/client";
import { loginSchema } from "@/lib/validation/schemas";

const INVALID_CREDENTIALS = "Email, username, or phone is incorrect.";

async function resolveIdentifierToEmail(identifier: string): Promise<string | null> {
  const res = await fetch("/api/auth/resolve-identifier", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { email?: string };
  return body.email ?? null;
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [identifier, setIdentifier] = useState("");
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
    if (!res.ok) throw new Error("Failed to mint session.");
  }

  function mapAuthError(err: unknown): string {
    if (err instanceof FirebaseError) {
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-email":
          return INVALID_CREDENTIALS;
        case "auth/too-many-requests":
          return "Too many attempts. Try again in a moment.";
        case "auth/network-request-failed":
          return "Network problem. Check your connection.";
        default:
          return "Sign-in failed. Please try again.";
      }
    }
    return "Sign-in failed. Please try again.";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ identifier, password });
    if (!parsed.success) {
      setError("Enter your username, email, or phone, and a password.");
      return;
    }
    setSubmitting(true);
    try {
      const email = await resolveIdentifierToEmail(parsed.data.identifier);
      if (!email) {
        setError(INVALID_CREDENTIALS);
        return;
      }
      await signInWithEmail({ email, password: parsed.data.password });
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Username, email, or phone"
          type="text"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          required
        />
        <Input
          label="Password"
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

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </Button>

        <Link
          href="/forgot-password"
          className="text-sm text-text-muted hover:text-text-primary self-end"
        >
          Forgot password?
        </Link>
      </form>
    </div>
  );
}
