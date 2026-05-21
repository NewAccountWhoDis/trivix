"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";

interface Venue {
  venueId: string;
  name: string;
}
interface GameSummary {
  gameId: string;
  name: string;
  questionCount: number;
}

export function NewGameForm({
  venues,
  games,
}: {
  venues: Venue[];
  games: GameSummary[];
}) {
  const router = useRouter();
  const [venueId, setVenueId] = useState(venues[0]?.venueId ?? "");
  const [gameId, setGameId] = useState(games[0]?.gameId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!venueId || !gameId) {
      setError("Choose both a venue and a game.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, gameId }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Launch failed");
      }
      const body = (await res.json()) as { sessionId: string };
      router.push(`/host/sessions/${body.sessionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
      setSubmitting(false);
    }
  }

  if (venues.length === 0 || games.length === 0) {
    return (
      <Card>
        <div className="p-6 flex flex-col gap-4">
          {venues.length === 0 && (
            <p className="text-text-muted">
              You need at least one venue.{" "}
              <Link
                href="/host/venues/new"
                className="text-brand-red underline"
              >
                Add a venue
              </Link>
              .
            </p>
          )}
          {games.length === 0 && (
            <p className="text-text-muted">
              You need at least one game.{" "}
              <Link href="/host/games/new" className="text-brand-red underline">
                Create one
              </Link>
              .
            </p>
          )}
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">Venue</span>
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="h-11 px-3 rounded-md bg-brand-ink border border-brand-line text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        >
          {venues.map((v) => (
            <option key={v.venueId} value={v.venueId}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">Game</span>
        <select
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          className="h-11 px-3 rounded-md bg-brand-ink border border-brand-line text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
        >
          {games.map((g) => (
            <option key={g.gameId} value={g.gameId}>
              {g.name} ({g.questionCount} question
              {g.questionCount === 1 ? "" : "s"})
            </option>
          ))}
        </select>
      </label>

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
          {submitting ? "Launching…" : "Launch"}
        </Button>
      </div>
    </form>
  );
}
