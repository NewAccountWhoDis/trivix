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
interface SetSummary {
  setId: string;
  name: string;
  questionCount: number;
}

export function NewGameForm({
  venues,
  sets,
}: {
  venues: Venue[];
  sets: SetSummary[];
}) {
  const router = useRouter();
  const [venueId, setVenueId] = useState(venues[0]?.venueId ?? "");
  const [questionSetId, setQuestionSetId] = useState(sets[0]?.setId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (venues.length === 0 || sets.length === 0) {
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
          {sets.length === 0 && (
            <p className="text-text-muted">
              You need at least one question set.{" "}
              <Link
                href="/host/question-sets/new"
                className="text-brand-red underline"
              >
                Create one
              </Link>
              .
            </p>
          )}
        </div>
      </Card>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!venueId || !questionSetId) {
      setError("Choose both a venue and a question set.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId, questionSetId }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Create failed");
      }
      const body = (await res.json()) as { sessionId: string };
      router.push(`/host/games/${body.sessionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">Venue</span>
        <select
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="h-11 px-3 rounded-md bg-brand-ink border border-brand-line text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          required
        >
          {venues.map((v) => (
            <option key={v.venueId} value={v.venueId}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">
          Question set
        </span>
        <select
          value={questionSetId}
          onChange={(e) => setQuestionSetId(e.target.value)}
          className="h-11 px-3 rounded-md bg-brand-ink border border-brand-line text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
          required
        >
          {sets.map((s) => (
            <option key={s.setId} value={s.setId}>
              {s.name} ({s.questionCount} question
              {s.questionCount === 1 ? "" : "s"})
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
          <Link href="/host">Cancel</Link>
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={submitting}
        >
          {submitting ? "Creating…" : "Create session"}
        </Button>
      </div>
    </form>
  );
}
