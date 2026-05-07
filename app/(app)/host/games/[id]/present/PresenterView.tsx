"use client";

import { useEffect, useState } from "react";
import type { Timestamp } from "firebase/firestore";
import { Countdown } from "@/components/games/Countdown";
import { QrCode, buildJoinUrl } from "@/components/games/QrCode";
import { useGameSession } from "@/hooks/useGameSession";
import { aggregateTeams } from "@/lib/games/team-aggregate";

interface PlayerRow {
  uid: string;
  displayName: string;
  score: number;
  teamId?: string | null;
  teamNameSnapshot?: string | null;
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
        <p className="text-game-red text-2xl">{error ?? "Session not found."}</p>
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
  const deadline = tsToMs(session.currentQuestionDeadline);

  const sanitizedQuestions =
    (session.questions as QuestionRow[] | undefined) ?? [];
  const fullQuestions =
    (answerKey?.questions as QuestionRow[] | undefined) ?? null;
  const questions: QuestionRow[] = sanitizedQuestions.map((q, i) => ({
    ...q,
    correctIndex: fullQuestions?.[i]?.correctIndex ?? q.correctIndex ?? null,
  }));

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

  const current =
    status === "active" ? questions[currentQuestionIndex] : null;

  if (status === "lobby") {
    const joinUrl = origin ? buildJoinUrl(origin, sessionCode) : "";
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 py-10 gap-10">
        {venueName && (
          <p className="font-display text-3xl md:text-5xl tracking-[6px] text-text-muted uppercase">
            {venueName}
          </p>
        )}
        <p className="text-2xl md:text-4xl text-text-muted">
          Join with this code
        </p>
        <div className="font-display text-[12rem] md:text-[18rem] leading-none tracking-[16px] text-text-primary">
          {sessionCode}
        </div>
        {joinUrl && (
          <div className="flex flex-col items-center gap-4">
            <QrCode value={joinUrl} size={384} />
            <p className="text-xl text-text-faint tracking-wider">
              or scan to join
            </p>
          </div>
        )}
        <p className="text-3xl md:text-4xl font-display tracking-[4px]">
          {players.length} {players.length === 1 ? "PLAYER" : "PLAYERS"} IN
        </p>
      </div>
    );
  }

  if (status === "active" && current) {
    const correct = current.correctIndex;
    return (
      <div className="min-h-screen flex flex-col px-10 py-10 gap-10">
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl md:text-4xl tracking-[6px] text-text-faint uppercase">
            Question {currentQuestionIndex + 1} / {questions.length}
          </p>
          <Countdown deadline={deadline} className="text-7xl md:text-9xl" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <h1 className="font-display text-5xl md:text-8xl tracking-[2px] text-center leading-tight max-w-7xl">
            {current.prompt}
          </h1>
        </div>
        <ul className="grid grid-cols-2 gap-6">
          {current.choices.map((c, i) => {
            const isCorrect = correct !== null && i === correct;
            const revealed = correct !== null;
            return (
              <li
                key={i}
                className={`p-8 rounded-xl border-2 transition-colors duration-300 ${
                  isCorrect
                    ? "border-game-green bg-game-green/15"
                    : revealed
                      ? "border-brand-line bg-brand-ink opacity-50"
                      : "border-brand-line bg-brand-ink"
                }`}
              >
                <div className="flex items-baseline gap-6">
                  <span
                    className={`font-display text-5xl md:text-7xl tracking-[4px] ${
                      isCorrect ? "text-game-green" : "text-text-faint"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-3xl md:text-5xl leading-tight">
                    {c}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  if (status === "ended") {
    const topTeams = teams.slice(0, 5);
    const topPlayers = players.slice(0, 5);
    const winner = topPlayers[0];
    return (
      <div className="min-h-screen flex flex-col items-center px-10 py-12 gap-10">
        <p className="font-display text-3xl md:text-5xl tracking-[8px] text-text-faint uppercase">
          Final Results
        </p>
        {winner && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-2xl md:text-3xl text-text-muted">Winner</p>
            <p className="font-display text-7xl md:text-9xl tracking-[4px] text-game-green">
              @{winner.displayName}
            </p>
            <p className="font-display text-4xl text-text-primary">
              {winner.score} pts
            </p>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-10 w-full max-w-7xl">
          <div>
            <h2 className="font-display text-3xl md:text-4xl tracking-[6px] mb-5 text-text-muted">
              TEAMS
            </h2>
            <ul className="flex flex-col gap-3">
              {topTeams.map((t, i) => (
                <li
                  key={t.teamId ?? "solo"}
                  className="flex items-center gap-5 px-5 py-4 rounded-lg bg-brand-line/30"
                >
                  <span className="font-display text-3xl text-text-faint w-10">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-2xl md:text-3xl truncate">
                    {t.teamName}
                  </span>
                  <span className="font-display text-3xl md:text-4xl">
                    {t.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-3xl md:text-4xl tracking-[6px] mb-5 text-text-muted">
              PLAYERS
            </h2>
            <ul className="flex flex-col gap-3">
              {topPlayers.map((p, i) => (
                <li
                  key={p.uid}
                  className="flex items-center gap-5 px-5 py-4 rounded-lg bg-brand-line/30"
                >
                  <span className="font-display text-3xl text-text-faint w-10">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-2xl md:text-3xl truncate">
                    @{p.displayName}
                  </span>
                  <span className="font-display text-3xl md:text-4xl">
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
