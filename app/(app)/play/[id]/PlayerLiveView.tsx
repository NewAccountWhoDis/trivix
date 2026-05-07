"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Timestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Countdown } from "@/components/games/Countdown";
import { useGameSession } from "@/hooks/useGameSession";

interface QuestionRow {
  prompt: string;
  choices: string[];
  points: number;
  correctIndex: number | null;
}

interface PlayerRow {
  uid: string;
  displayName: string;
  score: number;
  answers?: Record<
    string,
    { choiceIndex: number; correct: boolean } | undefined
  >;
}

function isTimestamp(v: unknown): v is Timestamp {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { toMillis?: unknown }).toMillis === "function"
  );
}

function tsToMs(value: unknown): number | null {
  return isTimestamp(value) ? value.toMillis() : null;
}

export function PlayerLiveView({
  sessionId,
  myUid,
}: {
  sessionId: string;
  myUid: string;
}) {
  const { session, loading, error } = useGameSession(sessionId, myUid);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);

  if (loading) return <p className="text-text-muted">Loading…</p>;
  if (error || !session) {
    return <p className="text-game-red">{error ?? "Session not found."}</p>;
  }

  const status = String(session.status ?? "lobby") as
    | "lobby"
    | "active"
    | "ended";
  const currentQuestionIndex = Number(session.currentQuestionIndex ?? -1);
  const deadline = tsToMs(session.currentQuestionDeadline);
  const playersMap = (session.players as Record<string, PlayerRow>) ?? {};
  const me = playersMap[myUid];
  const myScore = me?.score ?? 0;
  const players = Object.values(playersMap).sort((a, b) => b.score - a.score);
  const myAnswerKey = String(currentQuestionIndex);
  const myAnswer = me?.answers?.[myAnswerKey];

  const sanitizedQuestions =
    (session.questions as QuestionRow[] | undefined) ?? [];
  const currentRendered =
    status === "active" ? sanitizedQuestions[currentQuestionIndex] : null;
  const timerExpired = deadline !== null && now > deadline;

  async function submit(choiceIndex: number) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/games/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIndex: currentQuestionIndex,
          choiceIndex,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Submit failed");
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Live game</p>
          <h1 className="font-display text-3xl tracking-[3px]">YOUR SCORE</h1>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="font-display text-5xl">{myScore}</div>
          <Badge tone={status === "ended" ? "neutral" : "success"}>
            {status}
          </Badge>
          {status === "active" && (
            <Countdown deadline={deadline} className="text-2xl" />
          )}
        </div>
      </header>

      {submitError && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {submitError}
        </div>
      )}

      {status === "lobby" && (
        <Card>
          <div className="p-6 text-text-muted">
            Waiting for the host to start the game…
          </div>
        </Card>
      )}

      {status === "active" && currentRendered && (
        <Card variant="neon">
          <div className="p-6">
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Question {currentQuestionIndex + 1} · {currentRendered.points} pt
              {currentRendered.points === 1 ? "" : "s"}
            </div>
            <div className="font-display text-2xl tracking-[1px] mb-5">
              {currentRendered.prompt}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {currentRendered.choices.map((c, i) => {
                const reveal = currentRendered.correctIndex !== null;
                const isCorrect = i === currentRendered.correctIndex;
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
                    disabled={
                      submitting || Boolean(myAnswer) || reveal || timerExpired
                    }
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
            {myAnswer && currentRendered.correctIndex === null && (
              <p className="mt-4 text-sm text-text-muted">
                Locked in. Waiting for the host to reveal.
              </p>
            )}
            {!myAnswer && timerExpired && (
              <p className="mt-4 text-sm text-game-red">
                Time&rsquo;s up — no answer locked in.
              </p>
            )}
          </div>
        </Card>
      )}

      {status === "ended" && (
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
