"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { AnimatedChoice } from "@/components/games/AnimatedChoice";
import { Leaderboard } from "@/components/games/Leaderboard";
import { useGameSession } from "@/hooks/useGameSession";
import { aggregateTeams } from "@/lib/games/team-aggregate";

interface QuestionRow {
  format: "choice" | "typed";
  theme: string;
  sectionIndex: number;
  prompt: string;
  points: number;
  choices?: string[];
  correctIndex?: number | null;
  answerCount?: number;
  acceptedAnswers?: string[] | null;
}

interface AnswerRow {
  format: "choice" | "typed";
  choiceIndex?: number;
  typedAnswers?: string[];
  correct?: boolean;
  points?: number;
}

interface PlayerRow {
  uid: string;
  displayName: string;
  score: number;
  teamId?: string | null;
  teamNameSnapshot?: string | null;
  answers?: Record<string, AnswerRow | undefined>;
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
  const [typedSlots, setTypedSlots] = useState<string[]>([]);

  const currentQuestionIndex = Number(session?.currentQuestionIndex ?? -1);

  // Reset the typed input slots whenever the active question changes.
  useEffect(() => {
    const qs = (session?.questions as QuestionRow[] | undefined) ?? [];
    const q = qs[currentQuestionIndex];
    /* eslint-disable react-hooks/set-state-in-effect */
    if (q?.format === "typed") {
      setTypedSlots(Array.from({ length: q.answerCount ?? 1 }, () => ""));
    } else {
      setTypedSlots([]);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentQuestionIndex, session?.questions]);

  if (loading) return <p className="text-text-muted">Loading…</p>;
  if (error || !session) {
    return <p className="text-game-red">{error ?? "Session not found."}</p>;
  }

  const status = String(session.status ?? "lobby") as
    | "lobby"
    | "active"
    | "ended";
  const revealedIndex = Number(session.revealedIndex ?? -1);
  const gradedIndex = Number(session.gradedIndex ?? -1);
  const playersMap = (session.players as Record<string, PlayerRow>) ?? {};
  const me = playersMap[myUid];
  const myScore = me?.score ?? 0;
  const players = Object.values(playersMap).sort((a, b) => b.score - a.score);

  const teamAggregates = aggregateTeams(
    Object.fromEntries(
      Object.entries(playersMap).map(([uid, p]) => [
        uid,
        {
          uid: p.uid,
          displayName: p.displayName,
          score: p.score,
          teamId: p.teamId ?? null,
          teamNameSnapshot: p.teamNameSnapshot ?? null,
        },
      ]),
    ),
  );
  const myTeamId = me?.teamId ?? null;
  const myTeamRank = teamAggregates.findIndex((t) => t.teamId === myTeamId) + 1;
  const myTeam = teamAggregates.find((t) => t.teamId === myTeamId) ?? null;

  const isDemo = Boolean(session.isDemo);
  const atBreak = Boolean(session.atBreak);
  const questions = (session.questions as QuestionRow[] | undefined) ?? [];
  const q = status === "active" ? questions[currentQuestionIndex] : null;
  const nextQuestion = questions[currentQuestionIndex + 1] ?? null;
  const myAnswer = me?.answers?.[String(currentQuestionIndex)];
  const revealed = revealedIndex >= currentQuestionIndex;
  const graded = gradedIndex >= currentQuestionIndex;
  const isSectionStart =
    q != null &&
    (currentQuestionIndex === 0 ||
      questions[currentQuestionIndex - 1]?.sectionIndex !== q.sectionIndex);

  async function submitChoice(choiceIndex: number) {
    await submit({ format: "choice", choiceIndex });
  }
  async function submitTyped() {
    const cleaned = typedSlots.map((s) => s.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      setSubmitError("Type at least one answer.");
      return;
    }
    await submit({ format: "typed", typedAnswers: cleaned });
  }
  async function submit(payload: Record<string, unknown>) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIndex: currentQuestionIndex, ...payload }),
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
      {isDemo && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-brand-red/10 border border-brand-red/30 px-4 py-2">
          <span className="text-xs uppercase tracking-[3px] text-brand-red">
            Demo · watch only
          </span>
          <Button asChild variant="ghost">
            <Link href="/dashboard">Exit</Link>
          </Button>
        </div>
      )}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Live game</p>
          <h1 className="font-display text-3xl tracking-[3px]">YOUR SCORE</h1>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className="font-display text-5xl">{myScore}</div>
          {myTeam && (
            <p className="text-xs text-text-faint">
              Team {myTeam.teamName} · #{myTeamRank} ·{" "}
              <span className="text-text-muted">{myTeam.score} pts</span>
            </p>
          )}
          <Badge tone={status === "ended" ? "neutral" : "success"}>
            {status}
          </Badge>
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

      {status === "active" && atBreak && q && (
        <Card variant="neon">
          <div className="p-6 flex flex-col gap-2 text-center">
            <div className="text-xs uppercase tracking-[3px] text-text-faint">
              Round {q.sectionIndex + 1} complete
            </div>
            {nextQuestion && (
              <div className="font-display text-2xl tracking-[2px]">
                Up next · Round {nextQuestion.sectionIndex + 1} ·{" "}
                {nextQuestion.theme}
              </div>
            )}
            <p className="text-sm text-text-muted">
              Waiting for the host to start the next round…
            </p>
          </div>
        </Card>
      )}

      {status === "active" && q && !atBreak && (
        <Card variant="neon">
          <div className="p-6">
            {isSectionStart && (
              <div className="mb-4 rounded-md bg-brand-red/10 border border-brand-red/30 px-4 py-3 text-center">
                <div className="text-xs uppercase tracking-[3px] text-brand-red">
                  Round {q.sectionIndex + 1}
                </div>
                <div className="font-display text-xl tracking-[2px]">
                  {q.theme}
                </div>
              </div>
            )}
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              {q.theme} · Question {currentQuestionIndex + 1} · {q.points} pt
              {q.points === 1 ? "" : "s"}
              {q.format === "typed" ? " each" : ""}
            </div>
            <div className="font-display text-2xl tracking-[1px] mb-5">
              {q.prompt}
            </div>

            {isDemo && (
              <p className="mb-4 text-sm text-text-muted">
                👀 Watching the demo — the host is running this game.
              </p>
            )}

            {q.format === "choice" ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {(q.choices ?? []).map((c, i) => {
                  const isMine = myAnswer?.choiceIndex === i;
                  const correctIndex = revealed ? (q.correctIndex ?? null) : null;
                  return (
                    <AnimatedChoice key={i} index={i} correctIndex={correctIndex}>
                      {({ state, style }) => {
                        const tone =
                          state === "correct"
                            ? "border-game-green bg-game-green/10"
                            : state === "incorrect"
                              ? isMine
                                ? "border-game-red bg-game-red/10"
                                : "border-brand-line bg-brand-ink opacity-60"
                              : isMine
                                ? "border-brand-red bg-brand-red/10"
                                : "border-brand-line bg-brand-ink hover:border-brand-red";
                        return (
                          <button
                            type="button"
                            onClick={() => submitChoice(i)}
                            disabled={
                              submitting || Boolean(myAnswer) || revealed || isDemo
                            }
                            style={style}
                            className={`w-full text-left p-4 rounded-md border ${tone} disabled:cursor-default`}
                          >
                            <span className="text-text-muted mr-2">
                              {String.fromCharCode(65 + i)}.
                            </span>
                            {c}
                          </button>
                        );
                      }}
                    </AnimatedChoice>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {!myAnswer && !revealed && !isDemo ? (
                  <>
                    <p className="text-xs text-text-faint">
                      {q.answerCount} answer{q.answerCount === 1 ? "" : "s"} —
                      fill in as many as you can.
                    </p>
                    {typedSlots.map((val, i) => (
                      <input
                        key={i}
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setTypedSlots((prev) => {
                            const next = [...prev];
                            next[i] = e.target.value;
                            return next;
                          })
                        }
                        maxLength={100}
                        placeholder={`Answer ${i + 1}`}
                        className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                      />
                    ))}
                    <div>
                      <Button
                        type="button"
                        onClick={submitTyped}
                        disabled={submitting}
                      >
                        Lock in answers
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[2px] text-text-faint mb-1">
                        Your answers
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(myAnswer?.typedAnswers ?? []).map((a, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-md bg-brand-ink border border-brand-line text-sm"
                          >
                            {a}
                          </span>
                        ))}
                        {(myAnswer?.typedAnswers ?? []).length === 0 && (
                          <span className="text-sm text-text-faint">
                            No answer submitted.
                          </span>
                        )}
                      </div>
                    </div>
                    {revealed && q.acceptedAnswers && (
                      <div>
                        <p className="text-xs uppercase tracking-[2px] text-text-faint mb-1">
                          Accepted answers
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {q.acceptedAnswers.map((a, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 rounded-md bg-game-green/10 border border-game-green/30 text-sm text-game-green"
                            >
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {myAnswer && (
                      <p className="text-sm text-text-muted">
                        {graded
                          ? `+${myAnswer.points ?? 0} pts`
                          : "Locked in — host is scoring."}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {q.format === "choice" && myAnswer && !revealed && (
              <p className="mt-4 text-sm text-text-muted">
                Locked in. Waiting for the host to reveal.
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

      {teamAggregates.length > 0 && (
        <div>
          <h2 className="font-display text-xl tracking-[3px] mb-3">
            {status === "ended" ? "FINAL LEADERBOARD" : "LEADERBOARD"}
          </h2>
          <Card>
            <div className="p-4">
              <Leaderboard
                teams={teamAggregates}
                myTeamId={myTeamId}
                final={status === "ended"}
              />
            </div>
          </Card>
        </div>
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
