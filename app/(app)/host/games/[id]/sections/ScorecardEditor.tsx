"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { scorecardSectionSchema } from "@/lib/validation/schemas";
import type { GameQuestion, GameSection } from "@/types/firestore";

function newId(): string {
  return crypto.randomUUID();
}

/** One editable scorecard row — only slot count + points, no question text. */
interface Row {
  id: string;
  answerCount: number;
  points: number;
}

function blankRow(from?: Row): Row {
  return {
    id: newId(),
    answerCount: from?.answerCount ?? 1,
    points: from?.points ?? 1,
  };
}

function rowsFromSection(section: GameSection | null): Row[] {
  if (!section?.questions?.length) return [blankRow()];
  return section.questions.map((q) => ({
    id: q.id,
    answerCount: q.answerCount ?? q.acceptedAnswers?.length ?? 1,
    points: q.points,
  }));
}

interface Props {
  gameId: string;
  gameName: string;
  allSections: GameSection[];
  /** Section id being edited, or null when creating a new round. */
  sectionId: string | null;
  initialSection: GameSection | null;
}

export function ScorecardEditor({
  gameId,
  gameName,
  allSections,
  sectionId,
  initialSection,
}: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState(
    initialSection?.theme ?? `Round ${allSections.length + 1}`,
  );
  const [rows, setRows] = useState<Row[]>(rowsFromSection(initialSection));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  }

  function addRow() {
    if (rows.length >= 50) return;
    setRows((prev) => [...prev, blankRow(prev[prev.length - 1])]);
  }

  function removeRow(index: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Persist each row as a `typed` question with an auto label and no answer
    // key, so the live session pipeline scores it via manual host grading.
    const questions: GameQuestion[] = rows.map((r, i) => ({
      id: r.id,
      format: "typed",
      prompt: `Question ${i + 1}`,
      points: r.points,
      answerCount: r.answerCount,
    }));

    const section: GameSection = { id: sectionId ?? newId(), theme, questions };
    const parsed = scorecardSectionSchema.safeParse(section);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ");
      setError(`Fix the highlighted fields. ${issues}`);
      return;
    }

    const nextSections = sectionId
      ? allSections.map((s) => (s.id === sectionId ? parsed.data : s))
      : [...allSections, parsed.data];

    setBusy(true);
    try {
      const res = await fetch(`/api/games-library/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gameName,
          kind: "scorecard",
          sections: nextSections,
        }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Save failed");
      }
      router.push(`/host/games/${gameId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  const totalPoints = rows.reduce((n, r) => n + r.points * r.answerCount, 0);

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/host/games/${gameId}`}
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Back to game
        </Link>
      </div>

      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        {sectionId ? "EDIT ROUND" : "NEW ROUND"}
      </h1>
      <p className="text-text-muted mb-8">{gameName}</p>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card>
          <div className="p-5">
            <Input
              label="Round name"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              maxLength={60}
              placeholder="Round 1"
              required
              autoFocus
            />
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-[3px]">
            QUESTIONS ({rows.length})
          </h2>
          <span className="text-xs text-text-faint">{rows.length} / 50</span>
        </div>

        <p className="text-sm text-text-muted -mt-2">
          You read the questions to the room — Trivix just holds the scorecard.
          Set how many answers each question has and what each is worth.
        </p>

        <Card>
          <ul className="divide-y divide-brand-line">
            {rows.map((r, i) => (
              <li
                key={r.id}
                className="flex items-end gap-3 p-4 flex-wrap sm:flex-nowrap"
              >
                <div className="text-xs uppercase tracking-[3px] text-text-faint w-full sm:w-16 sm:pb-3">
                  Q{i + 1}
                </div>
                <div className="flex-1 min-w-[7rem]">
                  <Input
                    label="Answers"
                    type="number"
                    min={1}
                    max={20}
                    value={r.answerCount}
                    onChange={(e) =>
                      updateRow(i, {
                        answerCount: Math.min(
                          20,
                          Math.max(1, Number(e.target.value) || 1),
                        ),
                      })
                    }
                  />
                </div>
                <div className="flex-1 min-w-[7rem]">
                  <Input
                    label="Points each"
                    type="number"
                    min={1}
                    max={10}
                    value={r.points}
                    onChange={(e) =>
                      updateRow(i, {
                        points: Math.min(
                          10,
                          Math.max(1, Number(e.target.value) || 1),
                        ),
                      })
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={rows.length <= 1}
                  onClick={() => removeRow(i)}
                  aria-label={`Remove question ${i + 1}`}
                  className="sm:mb-1.5"
                >
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={addRow}
            disabled={rows.length >= 50}
          >
            Add question
          </Button>
          <span className="text-xs text-text-faint">
            {totalPoints} pts available this round
          </span>
        </div>

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
            <Link href={`/host/games/${gameId}`}>Cancel</Link>
          </Button>
          <Button type="submit" size="lg" className="flex-1" disabled={busy}>
            {busy ? "Saving…" : "Save round"}
          </Button>
        </div>
      </form>
    </main>
  );
}
