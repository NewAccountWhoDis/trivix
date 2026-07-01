"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { matchesAccepted, normalizeAnswer } from "@/lib/games/typed";

interface PlayerRow {
  answers?: Record<
    string,
    { format?: string; typedAnswers?: string[]; points?: number } | undefined
  >;
}

interface QuestionRow {
  format: "choice" | "typed";
  theme: string;
  sectionIndex: number;
  prompt: string;
  points: number;
  acceptedAnswers?: string[] | null;
}

interface DistinctAnswer {
  norm: string;
  display: string;
  count: number;
  auto: boolean;
}

interface Props {
  questions: QuestionRow[];
  playersMap: Record<string, PlayerRow>;
  approvals: Record<string, string[]> | null;
  revealedIndex: number;
  gradedIndex: number;
  busy: boolean;
  /** Posts to the grade route; resolves true on success. */
  gradeQuestion: (qIndex: number, approved: string[]) => Promise<boolean>;
}

export function RoundScoringPanel({
  questions,
  playersMap,
  approvals,
  revealedIndex,
  gradedIndex,
  busy,
  gradeQuestion,
}: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [approved, setApproved] = useState<Record<string, boolean>>({});

  // Distinct submitted typed answers for a question, with auto-match flags.
  const distinctFor = useMemo(
    () =>
      (qIndex: number): DistinctAnswer[] => {
        const accepted = questions[qIndex]?.acceptedAnswers ?? [];
        const map = new Map<
          string,
          { display: string; count: number; auto: boolean }
        >();
        for (const p of Object.values(playersMap)) {
          const a = p.answers?.[String(qIndex)];
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
                auto: matchesAccepted(raw, accepted),
              });
          }
        }
        return Array.from(map.entries()).map(([norm, v]) => ({ norm, ...v }));
      },
    [questions, playersMap],
  );

  // Only manually-graded (typed / scorecard) questions that have been revealed
  // can be scored. Multiple-choice is auto-scored on submit, so it's omitted.
  const gradable = useMemo(
    () =>
      questions
        .map((q, i) => ({ q, i }))
        .filter(({ q, i }) => q.format === "typed" && i <= revealedIndex),
    [questions, revealedIndex],
  );

  const rounds = useMemo(() => {
    const bySection = new Map<number, { q: QuestionRow; i: number }[]>();
    for (const item of gradable) {
      const list = bySection.get(item.q.sectionIndex) ?? [];
      list.push(item);
      bySection.set(item.q.sectionIndex, list);
    }
    return Array.from(bySection.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([sectionIndex, items]) => ({
        sectionIndex,
        theme: items[0]!.q.theme,
        items,
      }));
  }, [gradable]);

  if (rounds.length === 0) return null;

  function openGrade(qIndex: number) {
    const list = distinctFor(qIndex);
    const stored = approvals?.[String(qIndex)] ?? null;
    const seed: Record<string, boolean> = {};
    for (const d of list) {
      seed[d.norm] = stored ? stored.includes(d.norm) : d.auto;
    }
    setApproved(seed);
    setOpenIndex(qIndex);
  }

  async function save(qIndex: number) {
    const approvedList = distinctFor(qIndex)
      .filter((d) => approved[d.norm])
      .map((d) => d.display);
    const ok = await gradeQuestion(qIndex, approvedList);
    if (ok) setOpenIndex(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-xl tracking-[3px]">SCORE ROUNDS</h2>
        <span className="text-xs text-text-faint">
          Grade or fix any round until the game ends
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {rounds.map((round) => (
          <Card key={round.sectionIndex}>
            <div className="p-5">
              <div className="text-xs uppercase tracking-[3px] text-brand-red mb-3">
                Round {round.sectionIndex + 1} · {round.theme}
              </div>
              <ul className="flex flex-col divide-y divide-brand-line">
                {round.items.map(({ i }) => {
                  const scored = gradedIndex >= i;
                  const list = openIndex === i ? distinctFor(i) : [];
                  return (
                    <li key={i} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-text-primary">
                            Question {i + 1}
                          </span>
                          <span
                            className={`text-[10px] uppercase tracking-[2px] rounded px-1.5 py-0.5 border ${
                              scored
                                ? "text-game-green border-game-green/40 bg-game-green/10"
                                : "text-text-faint border-brand-line"
                            }`}
                          >
                            {scored ? "Scored" : "Not scored"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={openIndex === i ? "secondary" : "ghost"}
                          onClick={() =>
                            openIndex === i ? setOpenIndex(null) : openGrade(i)
                          }
                          disabled={busy}
                        >
                          {openIndex === i
                            ? "Close"
                            : scored
                              ? "Re-grade"
                              : "Grade"}
                        </Button>
                      </div>

                      {openIndex === i && (
                        <div className="mt-3 flex flex-col gap-3">
                          <p className="text-xs uppercase tracking-[2px] text-text-faint">
                            Submitted answers — tap to toggle correct
                          </p>
                          {list.length === 0 ? (
                            <p className="text-sm text-text-faint">
                              No answers submitted.
                            </p>
                          ) : (
                            <div className="flex flex-col gap-2">
                              {list.map((d) => (
                                <label
                                  key={d.norm}
                                  className="flex items-center gap-3 p-2 rounded-md bg-brand-ink border border-brand-line"
                                >
                                  <input
                                    type="checkbox"
                                    checked={Boolean(approved[d.norm])}
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
                          <div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => save(i)}
                              disabled={busy}
                            >
                              {scored ? "Save scores" : "Lock scores"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
