"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { gameNameSchema } from "@/lib/validation/schemas";

export function NewGameForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = gameNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a valid name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/games-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: parsed.data }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Create failed");
      }
      const body = (await res.json()) as { gameId: string };
      router.push(`/host/games/${body.gameId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <div className="p-5">
          <Input
            label="Game name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Friday Night Trivia"
            required
            autoFocus
          />
        </div>
      </Card>

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
          <Link href="/host/games">Cancel</Link>
        </Button>
        <Button type="submit" size="lg" className="flex-1" disabled={submitting}>
          {submitting ? "Creating…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
