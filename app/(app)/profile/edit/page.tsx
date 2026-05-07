"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { useUser } from "@/hooks/useUser";
import { profileEditSchema } from "@/lib/validation/schemas";

export default function ProfileEditPage() {
  const router = useRouter();
  const user = useUser();

  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dnChanged = displayName.trim().toLowerCase() !== user.displayNameKey;
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    setAvailable(null); // eslint-disable-line react-hooks/set-state-in-effect
    if (!dnChanged) return;
    const dn = displayName.trim();
    if (dn.length < 3 || !/^[a-zA-Z0-9_]+$/.test(dn)) return;
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
        if (!res.ok) return;
        const body = (await res.json()) as { available: boolean };
        setAvailable(body.available);
      } catch {
        // aborted
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [displayName, dnChanged]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = profileEditSchema.safeParse({
      firstName,
      lastName,
      displayName,
    });
    if (!parsed.success) {
      setError("Fix the highlighted fields.");
      return;
    }
    if (dnChanged && available === false) {
      setError("That username isn't available.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Update failed");
      }
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  const dnHint = !dnChanged
    ? "Username unchanged"
    : checking
      ? "Checking availability…"
      : available === true
        ? "Available"
        : available === false
          ? "Username isn't available"
          : "3–20 chars; letters, numbers, underscores";

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/profile"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back to profile
        </Link>
      </div>
      <h1 className="font-display text-4xl tracking-[3px] mb-8">
        EDIT PROFILE
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <Input
          label="Username"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          hint={dnHint}
          error={
            dnChanged && available === false
              ? "username isn't available"
              : undefined
          }
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
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </main>
  );
}
