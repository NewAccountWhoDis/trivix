"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import type { GameKind, GameSection } from "@/types/firestore";

interface PreviewQuestion {
  format: "choice" | "typed";
  theme: string;
  sectionIndex: number;
  prompt: string;
  points: number;
  choices?: [string, string, string, string];
  correctIndex?: number;
  acceptedAnswers: string[];
  answerCount: number;
}

interface Props {
  gameId: string;
  gameName: string;
  kind: GameKind;
  sections: GameSection[];
}

/** Flatten authored sections into the ordered question list players would see. */
function flatten(sections: GameSection[]): PreviewQuestion[] {
  const out: PreviewQuestion[] = [];
  sections.forEach((s, sectionIndex) => {
    for (const q of s.questions) {
      if (q.format === "choice") {
        out.push({
          format: "choice",
          theme: s.theme,
          sectionIndex,
          prompt: q.prompt,
          points: q.points,
          choices: q.choices,
          correctIndex: q.correctIndex,
          acceptedAnswers: [],
          answerCount: 0,
        });
      } else {
        const accepted = q.acceptedAnswers ?? [];
        out.push({
          format: "typed",
          theme: s.theme,
          sectionIndex,
          prompt: q.prompt,
          points: q.points,
          acceptedAnswers: accepted,
          answerCount: q.answerCount ?? accepted.length ?? 1,
        });
      }
    }
  });
  return out;
}

export function GamePreview({ gameId, gameName, kind, sections }: Props) {
  const questions = useMemo(() => flatten(sections), [sections]);
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const backHref = `/host/games/${gameId}`;
  const q = questions[index] ?? null;
  const isScorecard = kind === "scorecard";
  const isSectionStart =
    q != null &&
    (index === 0 || questions[index - 1]?.sectionIndex !== q.sectionIndex);

  function go(dir: -1 | 1) {
    setIndex((i) => Math.min(total - 1, Math.max(0, i + dir)));
    setRevealed(false);
  }

  if (total === 0 || !q) {
    return (
      <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto">
        <h1 className="font-display text-4xl tracking-[3px] mb-2">PREVIEW</h1>
        <p className="text-text-muted mb-8">{gameName}</p>
        <Card>
          <div className="p-6 text-text-muted">
            Nothing to preview yet — add {isScorecard ? "a round" : "questions"}{" "}
            first.
          </div>
        </Card>
        <div className="mt-8">
          <Button asChild variant="secondary">
            <Link href={backHref}>← Back to game</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-text-muted text-sm">Preview · what players see</p>
          <h1 className="font-display text-3xl tracking-[3px]">{gameName}</h1>
        </div>
        <Badge tone="pending">preview</Badge>
      </header>

      <div className="rounded-md bg-brand-red/10 border border-brand-red/30 px-4 py-2 text-xs text-text-muted">
        This is a dry run — nothing here is saved or scored.
      </div>

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
            {q.theme} · Question {index + 1} of {total} · {q.points} pt
            {q.points === 1 ? "" : "s"}
            {q.format === "typed" ? " each" : ""}
          </div>
          <div className="font-display text-2xl tracking-[1px] mb-5">
            {q.prompt}
          </div>

          {q.format === "choice" ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {(q.choices ?? []).map((c, i) => {
                const correct = revealed && q.correctIndex === i;
                return (
                  <div
                    key={i}
                    className={`w-full text-left p-4 rounded-md border ${
                      correct
                        ? "border-game-green bg-game-green/10"
                        : "border-brand-line bg-brand-ink"
                    }`}
                  >
                    <span className="text-text-muted mr-2">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {c}
                    {correct && (
                      <span className="ml-2 text-xs uppercase tracking-[2px] text-game-green">
                        answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-text-faint">
                {q.answerCount} answer{q.answerCount === 1 ? "" : "s"} — players
                fill in as many as they can.
              </p>
              {Array.from({ length: Math.max(1, q.answerCount) }, (_, i) => (
                <div
                  key={i}
                  className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-faint"
                >
                  Answer {i + 1}
                </div>
              ))}
              {revealed && (
                <div className="mt-1">
                  <p className="text-xs uppercase tracking-[2px] text-text-faint mb-1">
                    {q.acceptedAnswers.length > 0
                      ? "Accepted answers"
                      : "Scoring"}
                  </p>
                  {q.acceptedAnswers.length > 0 ? (
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
                  ) : (
                    <p className="text-sm text-text-muted">
                      Graded by the host during the game.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setRevealed((v) => !v)}
            >
              {revealed ? "Hide answer" : "Reveal answer"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Bottom navigation — previous, end preview, next */}
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => go(-1)}
          disabled={index === 0}
        >
          ← Previous
        </Button>
        <Button asChild variant="ghost">
          <Link href={backHref}>End preview</Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => go(1)}
          disabled={index >= total - 1}
        >
          Next →
        </Button>
      </div>
      <p className="text-center text-xs text-text-faint">
        {index + 1} / {total}
      </p>
    </main>
  );
}
