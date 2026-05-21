"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { gameSectionSchema } from "@/lib/validation/schemas";
import type {
  GameQuestion,
  GameQuestionFormat,
  GameSection,
} from "@/types/firestore";

function newId(): string {
  return crypto.randomUUID();
}

function blankQuestion(format: GameQuestionFormat): GameQuestion {
  if (format === "choice") {
    return {
      id: newId(),
      format: "choice",
      prompt: "",
      points: 1,
      choices: ["", "", "", ""],
      correctIndex: 0,
    };
  }
  return {
    id: newId(),
    format: "typed",
    prompt: "",
    points: 1,
    acceptedAnswers: [""],
  };
}

interface Props {
  gameId: string;
  gameName: string;
  allSections: GameSection[];
  /** Section id being edited, or null when creating a new section. */
  sectionId: string | null;
  initialSection: GameSection | null;
}

export function SectionEditor({
  gameId,
  gameName,
  allSections,
  sectionId,
  initialSection,
}: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialSection?.theme ?? "");
  const [questions, setQuestions] = useState<GameQuestion[]>(
    initialSection?.questions?.length
      ? initialSection.questions
      : [blankQuestion("choice")],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(index: number, patch: Partial<GameQuestion>) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch } as GameQuestion;
      return next;
    });
  }

  function setFormat(index: number, format: GameQuestionFormat) {
    setQuestions((prev) => {
      const next = [...prev];
      const id = next[index]!.id;
      const prompt = next[index]!.prompt;
      const points = next[index]!.points;
      next[index] = { ...blankQuestion(format), id, prompt, points };
      return next;
    });
  }

  function setChoice(qi: number, ci: 0 | 1 | 2 | 3, value: string) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[qi]!;
      const choices = [...(q.choices ?? ["", "", "", ""])] as [
        string,
        string,
        string,
        string,
      ];
      choices[ci] = value;
      next[qi] = { ...q, choices };
      return next;
    });
  }

  function setAnswer(qi: number, ai: number, value: string) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[qi]!;
      const answers = [...(q.acceptedAnswers ?? [])];
      answers[ai] = value;
      next[qi] = { ...q, acceptedAnswers: answers };
      return next;
    });
  }

  function addAnswer(qi: number) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[qi]!;
      const answers = [...(q.acceptedAnswers ?? [])];
      if (answers.length >= 20) return prev;
      next[qi] = { ...q, acceptedAnswers: [...answers, ""] };
      return next;
    });
  }

  function removeAnswer(qi: number, ai: number) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = next[qi]!;
      const answers = (q.acceptedAnswers ?? []).filter((_, i) => i !== ai);
      next[qi] = { ...q, acceptedAnswers: answers.length ? answers : [""] };
      return next;
    });
  }

  function addQuestion() {
    if (questions.length >= 50) return;
    setQuestions((prev) => [...prev, blankQuestion("choice")]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function moveQuestion(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const section: GameSection = {
      id: sectionId ?? newId(),
      theme,
      questions,
    };
    const parsed = gameSectionSchema.safeParse(section);
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
        body: JSON.stringify({ name: gameName, sections: nextSections }),
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
        {sectionId ? "EDIT SECTION" : "NEW SECTION"}
      </h1>
      <p className="text-text-muted mb-8">{gameName}</p>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <Card>
          <div className="p-5">
            <Input
              label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              maxLength={60}
              placeholder="80s Movies"
              required
              autoFocus
            />
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl tracking-[3px]">
            QUESTIONS ({questions.length})
          </h2>
          <span className="text-xs text-text-faint">
            {questions.length} / 50
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs uppercase tracking-[3px] text-text-faint">
                    Question {i + 1}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={i === 0}
                      onClick={() => moveQuestion(i, -1)}
                      aria-label="Move up"
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={i === questions.length - 1}
                      onClick={() => moveQuestion(i, 1)}
                      aria-label="Move down"
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={questions.length <= 1}
                      onClick={() => removeQuestion(i)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Format toggle */}
                <div
                  role="radiogroup"
                  aria-label="Answer format"
                  className="flex gap-2"
                >
                  {(["choice", "typed"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={q.format === f}
                      onClick={() => setFormat(i, f)}
                      className={`px-3 py-1.5 rounded-md border text-sm transition ${
                        q.format === f
                          ? "border-brand-red text-text-primary bg-brand-red/10"
                          : "border-brand-line text-text-muted hover:text-text-primary"
                      }`}
                    >
                      {f === "choice" ? "Multiple choice" : "Typed answers"}
                    </button>
                  ))}
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text-muted">
                    Prompt
                  </span>
                  <textarea
                    value={q.prompt}
                    onChange={(e) => updateQuestion(i, { prompt: e.target.value })}
                    rows={2}
                    maxLength={500}
                    className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition resize-none"
                    placeholder={
                      q.format === "choice"
                        ? "What year did Top Gun release?"
                        : "Name animals beginning with 'A'"
                    }
                    required
                  />
                </label>

                {q.format === "choice" ? (
                  <div className="grid grid-cols-1 gap-2">
                    {([0, 1, 2, 3] as const).map((c) => (
                      <label
                        key={c}
                        className="flex items-center gap-3 p-3 rounded-md bg-brand-ink border border-brand-line"
                      >
                        <input
                          type="radio"
                          name={`correct-${q.id}`}
                          checked={q.correctIndex === c}
                          onChange={() => updateQuestion(i, { correctIndex: c })}
                          className="accent-brand-red w-4 h-4"
                          aria-label={`Mark choice ${c + 1} as correct`}
                        />
                        <input
                          type="text"
                          value={q.choices?.[c] ?? ""}
                          onChange={(e) => setChoice(i, c, e.target.value)}
                          maxLength={200}
                          placeholder={`Choice ${c + 1}`}
                          className="flex-1 bg-transparent text-text-primary placeholder:text-text-faint focus-visible:outline-none"
                          required
                        />
                      </label>
                    ))}
                    <p className="text-xs text-text-faint">
                      Pick the one correct answer with the radio button.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {(q.acceptedAnswers ?? []).map((ans, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={ans}
                          onChange={(e) => setAnswer(i, ai, e.target.value)}
                          maxLength={100}
                          placeholder={`Accepted answer ${ai + 1}`}
                          className="flex-1 px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red"
                          required
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={(q.acceptedAnswers?.length ?? 1) <= 1}
                          onClick={() => removeAnswer(i, ai)}
                          aria-label="Remove answer"
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                    <div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => addAnswer(i)}
                        disabled={(q.acceptedAnswers?.length ?? 0) >= 20}
                      >
                        Add answer
                      </Button>
                    </div>
                    <p className="text-xs text-text-faint">
                      Each accepted answer is worth the points below.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={
                      q.format === "typed" ? "Points per answer" : "Points"
                    }
                    type="number"
                    min={1}
                    max={10}
                    value={q.points}
                    onChange={(e) =>
                      updateQuestion(i, { points: Number(e.target.value) || 1 })
                    }
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={addQuestion}
          disabled={questions.length >= 50}
        >
          Add question
        </Button>

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
            {busy ? "Saving…" : "Save section"}
          </Button>
        </div>
      </form>
    </main>
  );
}
