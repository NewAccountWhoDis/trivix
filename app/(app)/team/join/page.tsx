"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { joinTeamSchema } from "@/lib/validation/schemas";

export default function JoinTeamPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = joinTeamSchema.safeParse({ inviteCode: code });
    if (!parsed.success) {
      setError("Invite codes are 6 characters: A–Z, 2–9 (no O, I, L).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/teams/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Join failed");
      }
      router.push("/team/pending");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/team"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back
        </Link>
      </div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">JOIN A TEAM</h1>
      <p className="text-text-muted mb-8">
        Enter the 6-character invite code from your captain.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Invite code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABCD23"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-display text-2xl tracking-[6px] uppercase"
          required
          autoFocus
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
          {submitting ? "Sending…" : "Request to join"}
        </Button>
      </form>
    </main>
  );
}
