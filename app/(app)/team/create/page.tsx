"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { createTeamSchema } from "@/lib/validation/schemas";

export default function CreateTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = createTeamSchema.safeParse({ name });
    if (!parsed.success) {
      setError("Pick a name with 2–40 letters, numbers, or basic punctuation.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Create failed");
      }
      router.push("/team");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
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
      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        CREATE A TEAM
      </h1>
      <p className="text-text-muted mb-8">
        You&apos;ll be the captain. You can transfer the role anytime.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Team name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Quiz Crew"
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
          {submitting ? "Creating…" : "Create team"}
        </Button>
      </form>
    </main>
  );
}
