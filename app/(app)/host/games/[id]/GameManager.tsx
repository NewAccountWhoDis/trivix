"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { GameKind, GameSection } from "@/types/firestore";

export interface HostOption {
  uid: string;
  displayName: string;
  email: string;
  isOwner: boolean;
}

interface Props {
  gameId: string;
  ownerName: string;
  canEdit: boolean;
  kind: GameKind;
  initialName: string;
  initialSections: GameSection[];
  assigned: HostOption[];
  candidates: HostOption[];
}

export function GameManager({
  gameId,
  ownerName,
  canEdit,
  kind,
  initialName,
  initialSections,
  assigned,
  candidates,
}: Props) {
  const isScorecard = kind === "scorecard";
  const unit = isScorecard ? "round" : "section";
  const unitPlural = isScorecard ? "rounds" : "sections";
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [sections, setSections] = useState<GameSection[]>(initialSections);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(assigned.filter((h) => !h.isOwner).map((h) => h.uid)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function patchGame(nextSections: GameSection[], nextName = name) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/games-library/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nextName, sections: nextSections }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Save failed");
      }
      setSections(nextSections);
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveName() {
    if (await patchGame(sections, name)) setNotice("Name saved.");
  }

  async function deleteSection(id: string) {
    if (!confirm(`Delete this ${unit} and its questions?`)) return;
    await patchGame(sections.filter((s) => s.id !== id));
  }

  async function moveSection(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target]!, next[index]!];
    await patchGame(next);
  }

  async function saveAssignment() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/games-library/${gameId}/hosts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostUids: Array.from(selected) }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Save failed");
      }
      setNotice("Assigned hosts updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function toggle(uid: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/host/games"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← All games
        </Link>
      </div>

      <header className="mb-8">
        <p className="text-text-muted text-sm">
          Manage {isScorecard ? "scorecard" : "game"}
        </p>
        <h1 className="font-display text-4xl tracking-[3px]">
          {name || "UNTITLED"}
        </h1>
        {isScorecard && (
          <p className="text-text-faint text-sm mt-2 max-w-prose">
            Scorecard only — you run the questions yourself and Trivix keeps
            score. Players join, enter their answers each round, and you grade
            them live.
          </p>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 text-sm text-text-muted bg-brand-ink border border-brand-line rounded-md px-3 py-2">
          {notice}
        </div>
      )}

      {/* Name */}
      <Card>
        <div className="p-5 flex flex-col gap-4">
          {canEdit ? (
            <>
              <Input
                label="Game name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
              />
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={saveName}
                  disabled={busy || name === initialName}
                >
                  Save name
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-text-muted">
              You have view access to this game.
            </div>
          )}
        </div>
      </Card>

      {/* Assigned hosts */}
      <div className="mt-8">
        <h2 className="font-display text-2xl tracking-[3px] mb-3">HOSTS</h2>
        <Card>
          <div className="p-5 flex flex-col gap-4">
            <div className="text-sm text-text-muted">
              <span className="text-text-primary font-medium">
                {ownerName}
              </span>{" "}
              · Owner
            </div>

            {!canEdit ? (
              assigned
                .filter((h) => !h.isOwner)
                .map((h) => (
                  <div key={h.uid} className="text-sm text-text-muted">
                    {h.displayName}
                  </div>
                ))
            ) : candidates.length === 0 ? (
              <p className="text-sm text-text-faint">
                No sub-hosts on your account yet. Add sub-hosts to share games.
              </p>
            ) : (
              <>
                <p className="text-xs text-text-faint">
                  Assign sub-hosts on your account. They can view and start this
                  game.
                </p>
                <div className="flex flex-col gap-2">
                  {candidates.map((c) => (
                    <label
                      key={c.uid}
                      className="flex items-center gap-3 p-3 rounded-md bg-brand-ink border border-brand-line"
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.uid)}
                        onChange={() => toggle(c.uid)}
                        className="accent-brand-red w-4 h-4"
                      />
                      <span className="text-sm text-text-primary">
                        {c.displayName}
                      </span>
                      {c.email && (
                        <span className="text-xs text-text-faint">
                          {c.email}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                <div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={saveAssignment}
                    disabled={busy}
                  >
                    Save hosts
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Sections */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-2xl tracking-[3px]">
            {unitPlural.toUpperCase()} ({sections.length})
          </h2>
          {canEdit && (
            <Button asChild size="sm">
              <Link href={`/host/games/${gameId}/sections/new`}>
                Add {unit}
              </Link>
            </Button>
          )}
        </div>

        {sections.length === 0 ? (
          <Card>
            <div className="p-6 text-sm text-text-muted">
              No {unitPlural} yet.
              {canEdit &&
                (isScorecard
                  ? " Add a round to set its questions, answers and points."
                  : " Add a section to enter a theme and questions.")}
            </div>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-brand-line">
              {sections.map((s, i) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-5"
                >
                  <div>
                    <div className="font-medium text-text-primary">
                      {s.theme}
                    </div>
                    <div className="text-xs text-text-faint mt-0.5">
                      {s.questions.length} question
                      {s.questions.length === 1 ? "" : "s"}
                      {isScorecard &&
                        ` · ${s.questions.reduce(
                          (n, q) =>
                            n +
                            (q.answerCount ?? q.acceptedAnswers?.length ?? 0) *
                              q.points,
                          0,
                        )} pts`}
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={i === 0 || busy}
                        onClick={() => moveSection(i, -1)}
                        aria-label="Move up"
                      >
                        ↑
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={i === sections.length - 1 || busy}
                        onClick={() => moveSection(i, 1)}
                        aria-label="Move down"
                      >
                        ↓
                      </Button>
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/host/games/${gameId}/sections/${s.id}`}>
                          Edit
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={() => deleteSection(s.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {canEdit && (
        <div className="mt-10">
          <Button asChild variant="secondary">
            <Link href={`/host/sessions/new`}>Start this game →</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
