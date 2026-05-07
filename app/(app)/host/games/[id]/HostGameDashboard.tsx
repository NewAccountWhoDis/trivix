"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Timestamp } from "firebase/firestore";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Countdown } from "@/components/games/Countdown";
import { useGameSession } from "@/hooks/useGameSession";

interface PlayerRow {
  uid: string;
  displayName: string;
  score: number;
}

interface QuestionRow {
  prompt: string;
  choices: string[];
  points: number;
  correctIndex: number | null;
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

export function HostGameDashboard({
  sessionId,
  myUid,
}: {
  sessionId: string;
  myUid: string;
}) {
  const router = useRouter();
  const { session, answerKey, loading, error } = useGameSession(
    sessionId,
    myUid,
  );
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function call(
    path: string,
    method: "POST" | "DELETE" = "POST",
  ): Promise<void> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(path, { method });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Action failed");
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-text-muted">Loading session…</p>;
  if (error || !session) {
    return <p className="text-game-red">{error ?? "Session not found."}</p>;
  }

  const status = String(session.status ?? "lobby") as
    | "lobby"
    | "active"
    | "ended";
  const currentQuestionIndex = Number(session.currentQuestionIndex ?? -1);
  const sessionCode = String(session.sessionCode ?? "");
  const venueName = String(session.venueNameSnapshot ?? "");
  const questionSetName = String(session.questionSetNameSnapshot ?? "");
  const deadline = tsToMs(session.currentQuestionDeadline);

  const sanitizedQuestions =
    (session.questions as QuestionRow[] | undefined) ?? [];
  const fullQuestions =
    (answerKey?.questions as QuestionRow[] | undefined) ?? null;
  const questions: QuestionRow[] = sanitizedQuestions.map((q, i) => ({
    ...q,
    correctIndex: fullQuestions?.[i]?.correctIndex ?? q.correctIndex ?? null,
  }));

  const players: PlayerRow[] = Object.values(
    (session.players as Record<string, PlayerRow>) ?? {},
  ).sort((a, b) => b.score - a.score);

  const currentRendered =
    status === "active" ? questions[currentQuestionIndex] : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Game session</p>
          <h1 className="font-display text-3xl tracking-[3px]">
            {venueName.toUpperCase()}
          </h1>
          <p className="text-text-faint text-sm mt-1">{questionSetName}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            tone={
              status === "ended"
                ? "neutral"
                : status === "active"
                  ? "success"
                  : "pending"
            }
          >
            {status}
          </Badge>
          {sessionCode && status !== "ended" && (
            <div className="font-display text-3xl tracking-[6px]">
              {sessionCode}
            </div>
          )}
          {status === "active" && (
            <Countdown deadline={deadline} className="text-2xl" />
          )}
        </div>
      </header>

      {actionError && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {actionError}
        </div>
      )}

      {status === "lobby" && (
        <Card>
          <div className="p-5">
            <p className="text-text-muted mb-4">
              {players.length === 0
                ? "Waiting for players to join with the code above."
                : `${players.length} player${players.length === 1 ? "" : "s"} ready.`}
            </p>
            <div className="flex gap-3 flex-wrap">
              <Button
                onClick={() => call(`/api/games/${sessionId}/start`)}
                disabled={busy || players.length === 0}
              >
                Start game
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  if (confirm("Cancel this session?")) {
                    await call(`/api/games/${sessionId}`, "DELETE");
                    router.push("/host");
                    router.refresh();
                  }
                }}
                disabled={busy}
              >
                Cancel session
              </Button>
            </div>
          </div>
        </Card>
      )}

      {status === "active" && currentRendered && (
        <Card variant="neon">
          <div className="p-6">
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Question {currentQuestionIndex + 1} of {questions.length} ·{" "}
              {currentRendered.points} pt
              {currentRendered.points === 1 ? "" : "s"}
            </div>
            <div className="font-display text-2xl tracking-[1px] mb-5">
              {currentRendered.prompt}
            </div>
            <ul className="grid sm:grid-cols-2 gap-3">
              {currentRendered.choices.map((c, i) => (
                <li
                  key={i}
                  className={`p-3 rounded-md border ${
                    i === currentRendered.correctIndex
                      ? "border-game-green bg-game-green/10"
                      : "border-brand-line bg-brand-ink"
                  }`}
                >
                  <span className="text-text-muted mr-2">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  {c}
                  {i === currentRendered.correctIndex && (
                    <span className="ml-2 text-xs uppercase tracking-[2px] text-game-green">
                      correct
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => call(`/api/games/${sessionId}/advance`)}
                disabled={busy}
              >
                {currentQuestionIndex + 1 < questions.length
                  ? "Next question"
                  : "End game"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("End the game now?")) {
                    call(`/api/games/${sessionId}/end`);
                  }
                }}
                disabled={busy}
              >
                End now
              </Button>
            </div>
          </div>
        </Card>
      )}

      {status === "ended" && (
        <Card>
          <div className="p-6">
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Final results
            </div>
            <p className="text-text-muted mb-4">
              {players[0] &&
              players.length > 1 &&
              players[0].score > (players[1]?.score ?? 0)
                ? `Winner: @${players[0].displayName}`
                : players.length === 0
                  ? "No players."
                  : players.length === 1
                    ? `Winner: @${players[0]!.displayName}`
                    : "Tied — no winner this round."}
            </p>
          </div>
        </Card>
      )}

      <div>
        <h2 className="font-display text-xl tracking-[3px] mb-3">PLAYERS</h2>
        <Card>
          {players.length === 0 ? (
            <div className="p-5 text-text-muted text-sm">
              No one has joined yet.
            </div>
          ) : (
            <ul className="divide-y divide-brand-line">
              {players.map((p, i) => (
                <li key={p.uid} className="flex items-center gap-3 p-4">
                  <span className="text-text-faint w-6">{i + 1}.</span>
                  <span className="flex-1 text-text-primary">
                    @{p.displayName}
                  </span>
                  <span className="font-display text-xl">{p.score}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
