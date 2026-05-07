"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { createQuestionSetSchema } from "@/lib/validation/schemas";

interface QuestionDraft {
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  points: number;
}

const EMPTY_QUESTION: QuestionDraft = {
  prompt: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
  points: 1,
};

export interface QuestionSetEditorProps {
  mode: "create" | "edit";
  setId?: string;
  initial?: {
    name: string;
    description: string;
    questions: QuestionDraft[];
  };
}

export function QuestionSetEditor({
  mode,
  setId,
  initial,
}: QuestionSetEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [questions, setQuestions] = useState<QuestionDraft[]>(
    initial?.questions?.length ? initial.questions : [{ ...EMPTY_QUESTION }],
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(index: number, patch: Partial<QuestionDraft>) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index]!, ...patch };
      return next;
    });
  }

  function setChoice(index: number, choiceIdx: 0 | 1 | 2 | 3, value: string) {
    setQuestions((prev) => {
      const next = [...prev];
      const q = { ...next[index]! };
      const choices = [...q.choices] as [string, string, string, string];
      choices[choiceIdx] = value;
      q.choices = choices;
      next[index] = q;
      return next;
    });
  }

  function addQuestion() {
    if (questions.length >= 50) return;
    setQuestions((prev) => [...prev, { ...EMPTY_QUESTION }]);
  }

  function removeQuestion(index: number) {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      name,
      description: description.trim() ? description.trim() : null,
      questions,
    };
    const parsed = createQuestionSetSchema.safeParse(payload);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join("; ");
      setError(`Fix the highlighted fields. ${issues}`);
      return;
    }
    setSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/question-sets"
          : `/api/question-sets/${setId}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Save failed");
      }
      router.push("/host/question-sets");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <div className="p-5 flex flex-col gap-4">
          <Input
            label="Set name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Capitals of the World"
            required
            autoFocus
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-muted">
              Description (optional)
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
              rows={2}
              className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition resize-none"
              placeholder="What's this set about?"
            />
          </label>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl tracking-[3px]">
          QUESTIONS ({questions.length})
        </h2>
        <span className="text-xs text-text-faint">{questions.length} / 50</span>
      </div>

      <div className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <Card key={i}>
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
                    onClick={() => move(i, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={i === questions.length - 1}
                    onClick={() => move(i, 1)}
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
                    aria-label="Remove question"
                  >
                    Remove
                  </Button>
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-text-muted">
                  Prompt
                </span>
                <textarea
                  value={q.prompt}
                  onChange={(e) => update(i, { prompt: e.target.value })}
                  rows={2}
                  maxLength={500}
                  className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition resize-none"
                  placeholder="What is the capital of New York?"
                  required
                />
              </label>

              <div className="grid grid-cols-1 gap-2">
                {([0, 1, 2, 3] as const).map((c) => (
                  <label
                    key={c}
                    className="flex items-center gap-3 p-3 rounded-md bg-brand-ink border border-brand-line"
                  >
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={q.correctIndex === c}
                      onChange={() => update(i, { correctIndex: c })}
                      className="accent-brand-red w-4 h-4"
                      aria-label={`Mark choice ${c + 1} as correct`}
                    />
                    <input
                      type="text"
                      value={q.choices[c]}
                      onChange={(e) => setChoice(i, c, e.target.value)}
                      maxLength={200}
                      placeholder={`Choice ${c + 1}`}
                      className="flex-1 bg-transparent text-text-primary placeholder:text-text-faint focus-visible:outline-none"
                      required
                    />
                  </label>
                ))}
                <p className="text-xs text-text-faint">
                  Pick the correct answer with the radio button.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Points"
                  type="number"
                  min={1}
                  max={10}
                  value={q.points}
                  onChange={(e) =>
                    update(i, { points: Number(e.target.value) || 1 })
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
          <Link href="/host/question-sets">Cancel</Link>
        </Button>
        <Button
          type="submit"
          size="lg"
          className="flex-1"
          disabled={submitting}
        >
          {submitting
            ? "Saving…"
            : mode === "create"
              ? "Create set"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
