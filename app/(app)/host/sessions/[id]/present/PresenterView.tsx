"use client";

import { useEffect, useState } from "react";
import { AnimatedChoice } from "@/components/games/AnimatedChoice";
import { Leaderboard } from "@/components/games/Leaderboard";
import { QrCode, buildJoinUrl } from "@/components/games/QrCode";
import { useGameSession } from "@/hooks/useGameSession";
import { useWakeLock } from "@/hooks/useWakeLock";
import { aggregateTeams } from "@/lib/games/team-aggregate";

interface PlayerRow {
  uid: string;
  displayName: string;
  score: number;
  teamId?: string | null;
  teamNameSnapshot?: string | null;
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

export function PresenterView({
  sessionId,
  myUid,
}: {
  sessionId: string;
  myUid: string;
}) {
  const { session, answerKey, loading, error } = useGameSession(
    sessionId,
    myUid,
  );

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setOrigin(window.location.origin);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useWakeLock(session?.status === "active");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-muted text-2xl">Loading session…</p>
      </div>
    );
  }
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-game-red text-2xl">
          {error ?? "Session not found."}
        </p>
      </div>
    );
  }

  const status = String(session.status ?? "lobby") as
    | "lobby"
    | "active"
    | "ended";
  const sessionCode = String(session.sessionCode ?? "");
  const venueName = String(session.venueNameSnapshot ?? "");
  const currentQuestionIndex = Number(session.currentQuestionIndex ?? -1);
  const revealedIndex = Number(session.revealedIndex ?? -1);

  const keyQuestions = (answerKey?.questions as KeyRow[] | undefined) ?? null;
  const sanitized = (session.questions as QuestionRow[] | undefined) ?? [];
  const questions: QuestionRow[] = sanitized.map((q, i) => {
    const k = keyQuestions?.[i];
    return {
      ...q,
      correctIndex: k?.correctIndex ?? q.correctIndex ?? null,
      acceptedAnswers: k?.acceptedAnswers ?? q.acceptedAnswers ?? null,
    };
  });

  const playersMap = (session.players as Record<string, PlayerRow>) ?? {};
  const players: PlayerRow[] = Object.values(playersMap).sort(
    (a, b) => b.score - a.score,
  );
  const teams = aggregateTeams(
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

  const atBreak = Boolean(session.atBreak);
  const current = status === "active" ? questions[currentQuestionIndex] : null;
  const nextQuestion = questions[currentQuestionIndex + 1] ?? null;
  // Hold the visual reveal until the round break for end-of-round sections.
  const holdReveal = current?.revealMode === "end-of-round";
  const revealed = revealedIndex >= currentQuestionIndex && !holdReveal;
  const isSectionStart =
    current != null &&
    (currentQuestionIndex === 0 ||
      questions[currentQuestionIndex - 1]?.sectionIndex !==
        current.sectionIndex);

  if (status === "lobby") {
    const joinUrl = origin ? buildJoinUrl(origin, sessionCode) : "";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-12">
        {venueName && (
          <p className="font-display text-3xl md:text-5xl tracking-[6px] text-text-muted uppercase">
            {venueName}
          </p>
        )}
        <p className="text-2xl md:text-4xl text-text-muted tracking-wide">
          Join with this code
        </p>
        <div className="flex flex-col xl:flex-row items-center gap-12 xl:gap-20">
          <div className="font-display text-[10rem] md:text-[14rem] xl:text-[18rem] leading-none tracking-[12px] text-text-primary tabular-nums">
            {sessionCode}
          </div>
          {joinUrl && (
            <div className="flex flex-col items-center gap-3">
              <QrCode value={joinUrl} size={384} />
              <p className="text-xl text-text-faint tracking-wider uppercase">
                or scan to join
              </p>
            </div>
          )}
        </div>
        <p className="text-3xl md:text-4xl font-display tracking-[4px] tabular-nums">
          {players.length} {players.length === 1 ? "PLAYER" : "PLAYERS"} IN
        </p>
      </div>
    );
  }

  if (status === "active" && atBreak && current) {
    const sectionRecap =
      current.revealMode === "end-of-round"
        ? questions
            .map((row, i) => ({ row, i }))
            .filter(
              ({ row, i }) =>
                row.sectionIndex === current.sectionIndex &&
                i <= currentQuestionIndex,
            )
        : [];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-10 py-12 gap-10">
        <div className="flex flex-col items-center gap-3">
          <p className="font-display text-3xl md:text-5xl tracking-[8px] text-text-faint uppercase">
            Round {current.sectionIndex + 1} Complete
          </p>
          {nextQuestion && (
            <p className="font-display text-4xl md:text-6xl tracking-[4px] text-brand-red uppercase text-center">
              Up next · Round {nextQuestion.sectionIndex + 1} ·{" "}
              {nextQuestion.theme}
            </p>
          )}
        </div>
        {sectionRecap.length > 0 && (
          <div className="w-full max-w-5xl">
            <p className="font-display text-2xl md:text-3xl tracking-[4px] text-text-faint uppercase mb-4 text-center">
              Round Answers
            </p>
            <ul className="grid sm:grid-cols-2 gap-4">
              {sectionRecap.map(({ row, i }) => (
                <li
                  key={i}
                  className="rounded-xl border-2 border-brand-line bg-brand-ink p-5"
                >
                  <div className="text-xs md:text-sm uppercase tracking-[3px] text-text-faint mb-2">
                    Q{i + 1}
                  </div>
                  <div className="text-xl md:text-2xl text-text-primary mb-3 leading-snug">
                    {row.prompt}
                  </div>
                  {row.format === "choice" ? (
                    <div className="text-xl md:text-2xl text-game-green">
                      {typeof row.correctIndex === "number"
                        ? `${String.fromCharCode(65 + row.correctIndex)}. ${row.choices?.[row.correctIndex] ?? ""}`
                        : "—"}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(row.acceptedAnswers ?? []).map((a, ai) => (
                        <span
                          key={ai}
                          className="px-3 py-1 rounded-md border border-game-green/40 bg-game-green/10 text-base md:text-lg text-game-green"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="w-full max-w-4xl">
          <Leaderboard teams={teams} size="lg" max={8} />
        </div>
      </div>
    );
  }

  if (status === "active" && current) {
    return (
      <div className="min-h-screen flex flex-col px-10 py-10 gap-8">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl md:text-4xl tracking-[6px] text-text-faint uppercase tabular-nums">
            Q{currentQuestionIndex + 1} / {questions.length}
          </p>
          <p className="font-display text-2xl md:text-4xl tracking-[6px] text-brand-red uppercase">
            {current.theme}
          </p>
        </div>

        {isSectionStart && (
          <p className="font-display text-3xl md:text-5xl tracking-[8px] text-center text-brand-red uppercase">
            Round {current.sectionIndex + 1}
          </p>
        )}

        <div className="flex-1 flex items-center justify-center">
          <h1 className="font-display text-5xl md:text-7xl xl:text-8xl 2xl:text-9xl tracking-[2px] text-center leading-[1.05] max-w-7xl break-words">
            {current.prompt}
          </h1>
        </div>

        {current.format === "choice" ? (
          <ul className="grid grid-cols-2 gap-6">
            {(current.choices ?? []).map((c, i) => (
              <AnimatedChoice
                key={i}
                index={i}
                correctIndex={revealed ? (current.correctIndex ?? null) : null}
              >
                {({ state, style }) => (
                  <li
                    style={style}
                    className={`p-6 md:p-8 rounded-xl border-2 ${
                      state === "correct"
                        ? "border-game-green bg-game-green/15"
                        : state === "incorrect"
                          ? "border-brand-line bg-brand-ink opacity-40"
                          : "border-brand-line bg-brand-ink"
                    }`}
                  >
                    <div className="flex items-baseline gap-6">
                      <span
                        className={`font-display text-5xl md:text-7xl xl:text-8xl tracking-[4px] shrink-0 ${
                          state === "correct"
                            ? "text-game-green"
                            : "text-text-faint"
                        }`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-3xl md:text-4xl xl:text-5xl leading-tight break-words min-w-0">
                        {c}
                      </span>
                    </div>
                  </li>
                )}
              </AnimatedChoice>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-2xl md:text-3xl text-text-muted tracking-wide uppercase">
              {current.answerCount} answer
              {current.answerCount === 1 ? "" : "s"} · {current.points} pt
              {current.points === 1 ? "" : "s"} each
            </p>
            {revealed && current.acceptedAnswers && (
              <div className="flex flex-wrap justify-center gap-4 max-w-6xl">
                {current.acceptedAnswers.map((a, i) => (
                  <span
                    key={i}
                    className="px-6 py-3 rounded-xl border-2 border-game-green bg-game-green/15 text-3xl md:text-4xl text-game-green"
                  >
                    {a}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {teams.length > 0 && (
          <div className="border-t border-brand-line pt-5">
            <Leaderboard teams={teams} size="lg" max={5} />
          </div>
        )}
      </div>
    );
  }

  if (status === "ended") {
    const topPlayers = players.slice(0, 5);
    const winner = topPlayers[0];
    return (
      <div className="min-h-screen flex flex-col items-center px-10 py-12 gap-10">
        <p className="font-display text-3xl md:text-5xl xl:text-6xl tracking-[8px] text-text-faint uppercase">
          Final Results
        </p>
        {winner && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-2xl md:text-3xl text-text-muted tracking-wide uppercase">
              Winner
            </p>
            <p className="font-display text-7xl md:text-9xl xl:text-[10rem] tracking-[4px] text-game-green leading-none break-words text-center max-w-[16ch]">
              @{winner.displayName}
            </p>
            <p className="font-display text-4xl xl:text-5xl text-text-primary tabular-nums">
              {winner.score} pts
            </p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-10 w-full max-w-7xl">
          <div>
            <h2 className="font-display text-3xl md:text-4xl xl:text-5xl tracking-[6px] mb-5 text-text-muted">
              TEAMS
            </h2>
            <Leaderboard teams={teams} size="lg" final max={6} />
          </div>
          <div>
            <h2 className="font-display text-3xl md:text-4xl xl:text-5xl tracking-[6px] mb-5 text-text-muted">
              PLAYERS
            </h2>
            <ul className="flex flex-col gap-3">
              {topPlayers.map((p, i) => (
                <li
                  key={p.uid}
                  className="flex items-center gap-5 px-5 py-4 rounded-lg bg-brand-line/30"
                >
                  <span className="font-display text-3xl xl:text-4xl text-text-faint w-10 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-2xl md:text-3xl xl:text-4xl truncate">
                    @{p.displayName}
                  </span>
                  <span className="font-display text-3xl md:text-4xl xl:text-5xl tabular-nums">
                    {p.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-text-muted text-2xl">Waiting…</p>
    </div>
  );
}
