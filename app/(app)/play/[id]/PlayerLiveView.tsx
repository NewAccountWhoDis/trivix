"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";

interface PlayerLite {
  uid: string;
  displayName: string;
  score: number;
  answers: Record<
    string,
    { choiceIndex: number; correct: boolean } | undefined
  >;
}

interface SessionState {
  sessionId: string;
  status: "lobby" | "active" | "ended";
  currentQuestionIndex: number;
  revealedIndex: number;
  questions: Array<
    | { hidden: true }
    | {
        prompt: string;
        choices: string[];
        points: number;
        correctIndex: number | null;
      }
  >;
  players: Record<string, PlayerLite>;
  isPlayer: boolean;
  isHost: boolean;
}

export function PlayerLiveView({
  sessionId,
  myUid,
}: {
  sessionId: string;
  myUid: string;
}) {
  const [state, setState] = useState<SessionState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/games/${sessionId}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Could not load session.");
      return;
    }
    setState((await res.json()) as SessionState);
  }, [sessionId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function submit(choiceIndex: number) {
    if (!state) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: state.currentQuestionIndex,
          choiceIndex,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Submit failed");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!state) return <p className="text-text-muted">Loading…</p>;

  const me = state.players[myUid];
  const myScore = me?.score ?? 0;
  const players = Object.values(state.players).sort(
    (a, b) => b.score - a.score,
  );
  const myAnswerKey = String(state.currentQuestionIndex);
  const myAnswer = me?.answers?.[myAnswerKey];
  const currentQ =
    state.status === "active"
      ? state.questions[state.currentQuestionIndex]
      : null;
  const renderable = currentQ && !("hidden" in currentQ) ? currentQ : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Live game</p>
          <h1 className="font-display text-3xl tracking-[3px]">YOUR SCORE</h1>
        </div>
        <div className="text-right">
          <div className="font-display text-5xl">{myScore}</div>
          <Badge tone={state.status === "ended" ? "neutral" : "success"}>
            {state.status}
          </Badge>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}

      {state.status === "lobby" && (
        <Card>
          <div className="p-6 text-text-muted">
            Waiting for the host to start the game…
          </div>
        </Card>
      )}

      {state.status === "active" && renderable && (
        <Card variant="neon">
          <div className="p-6">
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Question {state.currentQuestionIndex + 1} · {renderable.points} pt
              {renderable.points === 1 ? "" : "s"}
            </div>
            <div className="font-display text-2xl tracking-[1px] mb-5">
              {renderable.prompt}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {renderable.choices.map((c, i) => {
                const reveal = renderable.correctIndex !== null;
                const isCorrect = i === renderable.correctIndex;
                const isMine = myAnswer?.choiceIndex === i;
                const tone = reveal
                  ? isCorrect
                    ? "border-game-green bg-game-green/10"
                    : isMine
                      ? "border-game-red bg-game-red/10"
                      : "border-brand-line bg-brand-ink"
                  : isMine
                    ? "border-brand-red bg-brand-red/10"
                    : "border-brand-line bg-brand-ink hover:border-brand-red";
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => submit(i)}
                    disabled={submitting || Boolean(myAnswer) || reveal}
                    className={`text-left p-4 rounded-md border transition ${tone} disabled:cursor-default`}
                  >
                    <span className="text-text-muted mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {c}
                  </button>
                );
              })}
            </div>
            {myAnswer && !renderable.correctIndex && (
              <p className="mt-4 text-sm text-text-muted">
                Locked in. Waiting for the host to reveal.
              </p>
            )}
          </div>
        </Card>
      )}

      {state.status === "ended" && (
        <Card>
          <div className="p-6">
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Game over
            </div>
            <p className="text-text-muted mb-4">
              Final score:{" "}
              <span className="font-display text-xl">{myScore}</span>
            </p>
            <Button asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </Card>
      )}

      <div>
        <h2 className="font-display text-xl tracking-[3px] mb-3">SCORES</h2>
        <Card>
          <ul className="divide-y divide-brand-line">
            {players.map((p, i) => (
              <li key={p.uid} className="flex items-center gap-3 p-4">
                <span className="text-text-faint w-6">{i + 1}.</span>
                <span className="flex-1 text-text-primary">
                  @{p.displayName}
                  {p.uid === myUid && (
                    <span className="ml-2 text-xs text-text-faint">(you)</span>
                  )}
                </span>
                <span className="font-display text-xl">{p.score}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
