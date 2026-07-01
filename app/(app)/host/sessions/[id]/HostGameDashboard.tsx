"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { AnimatedChoice } from "@/components/games/AnimatedChoice";
import { QrCode, buildJoinUrl } from "@/components/games/QrCode";
import { useGameSession } from "@/hooks/useGameSession";
import { aggregateTeams } from "@/lib/games/team-aggregate";
import { matchesAccepted, normalizeAnswer } from "@/lib/games/typed";
import { RoundScoringPanel } from "./RoundScoringPanel";

interface PlayerRow {
  uid: string;
  displayName: string;
  score: number;
  teamId?: string | null;
  teamNameSnapshot?: string | null;
  answers?: Record<
    string,
    { format?: string; typedAnswers?: string[] } | undefined
  >;
}

interface QuestionRow {
  format: "choice" | "typed";
  theme: string;
  sectionIndex: number;
  revealMode?: "per-question" | "end-of-round";
  prompt: string;
  points: number;
  choices?: string[];
  correctIndex?: number | null;
  answerCount?: number;
  acceptedAnswers?: string[] | null;
}

interface KeyRow {
  format?: "choice" | "typed";
  correctIndex?: number;
  acceptedAnswers?: string[];
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
  const [origin, setOrigin] = useState("");
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  const currentQuestionIndex = Number(session?.currentQuestionIndex ?? -1);
  const revealedIndex = Number(session?.revealedIndex ?? -1);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrigin(window.location.origin);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Build the distinct submitted typed answers for the current question and
  // pre-approve the ones that auto-match the accepted list.
  const keyQuestions = (answerKey?.questions as KeyRow[] | undefined) ?? null;
  const playersMapRaw = useMemo(
    () => (session?.players as Record<string, PlayerRow>) ?? {},
    [session?.players],
  );
  const acceptedForCurrent = useMemo(
    () => keyQuestions?.[currentQuestionIndex]?.acceptedAnswers ?? [],
    [keyQuestions, currentQuestionIndex],
  );

  const distinctTyped = useMemo(() => {
    const map = new Map<
      string,
      { display: string; count: number; auto: boolean }
    >();
    for (const p of Object.values(playersMapRaw)) {
      const a = p.answers?.[String(currentQuestionIndex)];
      if (!a || a.format !== "typed") continue;
      const seen = new Set<string>();
      for (const raw of a.typedAnswers ?? []) {
        const norm = normalizeAnswer(raw);
        if (!norm || seen.has(norm)) continue;
        seen.add(norm);
        const existing = map.get(norm);
        if (existing) existing.count += 1;
        else
          map.set(norm, {
            display: raw,
            count: 1,
            auto: matchesAccepted(raw, acceptedForCurrent),
          });
      }
    }
    return Array.from(map.entries()).map(([norm, v]) => ({ norm, ...v }));
  }, [playersMapRaw, currentQuestionIndex, acceptedForCurrent]);

  // When a typed question is revealed, seed approvals from the auto-matches.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const seed: Record<string, boolean> = {};
    for (const d of distinctTyped) seed[d.norm] = d.auto;
    setApproved(seed);
    /* eslint-enable react-hooks/set-state-in-effect */
    // Re-seed only when the question changes or is first revealed — not on
    // every new submission, which would clobber the host's manual toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, revealedIndex]);

  async function call(
    path: string,
    method: "POST" | "DELETE" = "POST",
    body?: unknown,
  ): Promise<boolean> {
    setBusy(true);
    setActionError(null);
    try {
      const res = await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Action failed");
      }
      return true;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Action failed");
      return false;
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
  const gradedIndex = Number(session.gradedIndex ?? -1);
  const sessionCode = String(session.sessionCode ?? "");
  const isDemo = Boolean(session.isDemo);
  const venueName = String(session.venueNameSnapshot ?? "");
  const gameName = String(session.gameNameSnapshot ?? "");

  const sanitized = (session.questions as QuestionRow[] | undefined) ?? [];
  const questions: QuestionRow[] = sanitized.map((q, i) => {
    const k = keyQuestions?.[i];
    return {
      ...q,
      correctIndex: k?.correctIndex ?? q.correctIndex ?? null,
      acceptedAnswers: k?.acceptedAnswers ?? q.acceptedAnswers ?? null,
    };
  });

  const players: PlayerRow[] = Object.values(playersMapRaw).sort(
    (a, b) => b.score - a.score,
  );
  const teamAggregates = aggregateTeams(
    Object.fromEntries(
      Object.entries(playersMapRaw).map(([uid, p]) => [
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

  const atBreak = Boolean(session.atBreak);
  const current = status === "active" ? questions[currentQuestionIndex] : null;
  const nextQuestion = questions[currentQuestionIndex + 1] ?? null;
  const revealed = revealedIndex >= currentQuestionIndex;
  const graded = gradedIndex >= currentQuestionIndex;
  const isSectionStart =
    current != null &&
    (currentQuestionIndex === 0 ||
      questions[currentQuestionIndex - 1]?.sectionIndex !==
        current.sectionIndex);
  const isLast = currentQuestionIndex + 1 >= questions.length;

  async function reveal() {
    await call(`/api/sessions/${sessionId}/reveal`);
  }
  async function lockScores() {
    const approvedList = distinctTyped
      .filter((d) => approved[d.norm])
      .map((d) => d.display);
    await call(`/api/sessions/${sessionId}/grade`, "POST", {
      questionIndex: currentQuestionIndex,
      approved: approvedList,
    });
  }
  async function advance() {
    const ok = await call(`/api/sessions/${sessionId}/advance`);
    if (ok && isLast) router.refresh();
  }
  async function gradeQuestion(qIndex: number, approvedList: string[]) {
    return call(`/api/sessions/${sessionId}/grade`, "POST", {
      questionIndex: qIndex,
      approved: approvedList,
    });
  }
  async function exitDemo() {
    const ok = await call(`/api/sessions/${sessionId}`, "DELETE");
    if (ok) {
      router.push("/host");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {isDemo && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-brand-red/10 border border-brand-red/30 px-4 py-2">
          <span className="text-xs uppercase tracking-[3px] text-brand-red">
            Demo mode · sample game
          </span>
          <Button variant="ghost" onClick={exitDemo} disabled={busy}>
            Exit demo
          </Button>
        </div>
      )}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Game session</p>
          <h1 className="font-display text-3xl tracking-[3px]">
            {venueName.toUpperCase()}
          </h1>
          <p className="text-text-faint text-sm mt-1">{gameName}</p>
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
          <div className="p-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1 flex flex-col gap-4">
              <p className="text-text-muted">
                {players.length === 0
                  ? "Waiting for players to join with the code above."
                  : `${players.length} player${players.length === 1 ? "" : "s"} ready.`}
              </p>
              <div className="flex gap-3 flex-wrap">
                <Button
                  onClick={() => call(`/api/sessions/${sessionId}/start`)}
                  disabled={busy || players.length === 0}
                >
                  Start game
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (confirm("Cancel this session?")) {
                      await call(`/api/sessions/${sessionId}`, "DELETE");
                      router.push("/host/games");
                      router.refresh();
                    }
                  }}
                  disabled={busy}
                >
                  Cancel session
                </Button>
              </div>
              <a
                href={`/host/sessions/${sessionId}/present`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-muted hover:text-text-primary underline self-start"
              >
                Open presenter view ↗
              </a>
            </div>
            {origin && sessionCode && (
              <div className="flex flex-col items-center gap-2">
                <QrCode value={buildJoinUrl(origin, sessionCode)} size={160} />
                <p className="text-xs text-text-faint tracking-wider">
                  scan to join
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {status === "active" && current && (
        <Card variant="neon">
          <div className="p-6">
            {isSectionStart && (
              <div className="mb-4 text-xs uppercase tracking-[3px] text-brand-red">
                Round {current.sectionIndex + 1} · {current.theme}
              </div>
            )}
            {current.revealMode === "end-of-round" && (
              <div className="mb-3 inline-flex items-center gap-2 text-[10px] uppercase tracking-[2px] text-text-faint border border-brand-line rounded px-2 py-1">
                <span className="size-1.5 rounded-full bg-brand-red" />
                Answers hidden from players until round break
              </div>
            )}
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              {current.theme} · Question {currentQuestionIndex + 1} of{" "}
              {questions.length} · {current.points} pt
              {current.points === 1 ? "" : "s"}
              {current.format === "typed" ? " each" : ""}
            </div>
            <div className="font-display text-2xl tracking-[1px] mb-5">
              {current.prompt}
            </div>

            {current.format === "choice" ? (
              <ul className="grid sm:grid-cols-2 gap-3">
                {(current.choices ?? []).map((c, i) => (
                  <AnimatedChoice
                    key={i}
                    index={i}
                    correctIndex={
                      revealed ? (current.correctIndex ?? null) : null
                    }
                  >
                    {({ style }) => (
                      <li
                        style={style}
                        className={`p-3 rounded-md border ${
                          revealed && current.correctIndex === i
                            ? "border-game-green bg-game-green/10"
                            : "border-brand-line bg-brand-ink"
                        }`}
                      >
                        <span className="text-text-muted mr-2">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        {c}
                        {!revealed && current.correctIndex === i && (
                          <span className="ml-2 text-xs uppercase tracking-[2px] text-text-faint">
                            answer
                          </span>
                        )}
                      </li>
                    )}
                  </AnimatedChoice>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col gap-3">
                {(current.acceptedAnswers ?? []).length > 0 ? (
                  <div>
                    <p className="text-xs uppercase tracking-[2px] text-text-faint mb-1">
                      Accepted answers
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(current.acceptedAnswers ?? []).map((a, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-md bg-brand-ink border border-brand-line text-sm"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-faint">
                    No answer key — reveal, then tap each submitted answer you
                    count as correct.
                  </p>
                )}

                {revealed && (
                  <div>
                    <p className="text-xs uppercase tracking-[2px] text-text-faint mb-1">
                      Submitted answers — tap to toggle correct
                    </p>
                    {distinctTyped.length === 0 ? (
                      <p className="text-sm text-text-faint">
                        No answers submitted.
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {distinctTyped.map((d) => (
                          <label
                            key={d.norm}
                            className="flex items-center gap-3 p-2 rounded-md bg-brand-ink border border-brand-line"
                          >
                            <input
                              type="checkbox"
                              checked={Boolean(approved[d.norm])}
                              disabled={graded}
                              onChange={() =>
                                setApproved((prev) => ({
                                  ...prev,
                                  [d.norm]: !prev[d.norm],
                                }))
                              }
                              className="accent-game-green w-4 h-4"
                            />
                            <span className="flex-1 text-sm text-text-primary">
                              {d.display}
                            </span>
                            <span className="text-xs text-text-faint">
                              ×{d.count}
                              {d.auto ? " · auto" : ""}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {atBreak && (
              <div className="mt-6 rounded-md bg-brand-red/10 border border-brand-red/30 px-4 py-3 text-sm text-text-muted">
                Round {current.sectionIndex + 1} complete — players are viewing
                the leaderboard.
              </div>
            )}

            <div className="flex gap-3 mt-6 flex-wrap">
              {!revealed ? (
                <Button onClick={reveal} disabled={busy}>
                  Reveal answer
                </Button>
              ) : current.format === "typed" && !graded ? (
                <Button onClick={lockScores} disabled={busy}>
                  Lock scores
                </Button>
              ) : (
                <Button onClick={advance} disabled={busy}>
                  {atBreak && nextQuestion
                    ? `Start Round ${nextQuestion.sectionIndex + 1}`
                    : isLast
                      ? "End game"
                      : "Next question"}
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("End the game now?")) {
                    call(`/api/sessions/${sessionId}/end`);
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

      {status === "active" && (
        <RoundScoringPanel
          questions={questions}
          playersMap={playersMapRaw}
          approvals={
            (answerKey?.approvals as Record<string, string[]> | undefined) ??
            null
          }
          revealedIndex={revealedIndex}
          gradedIndex={gradedIndex}
          busy={busy}
          gradeQuestion={gradeQuestion}
        />
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

      {teamAggregates.length > 0 && (
        <div>
          <h2 className="font-display text-xl tracking-[3px] mb-3">TEAMS</h2>
          <Card>
            <ul className="divide-y divide-brand-line">
              {teamAggregates.map((t, i) => (
                <li
                  key={t.teamId ?? "solo"}
                  className="flex items-center gap-3 p-4"
                >
                  <span className="text-text-faint w-6">{i + 1}.</span>
                  <span className="flex-1 text-text-primary">
                    {t.teamName}
                    <span className="ml-2 text-xs text-text-faint">
                      ({t.members.length} player
                      {t.members.length === 1 ? "" : "s"})
                    </span>
                  </span>
                  <span className="font-display text-xl">{t.score}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
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
