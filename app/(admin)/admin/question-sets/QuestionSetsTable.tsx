"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";

export interface AdminQuestionSetRow {
  setId: string;
  ownerUid: string;
  ownerDisplayName: string | null;
  name: string;
  description: string | null;
  questionCount: number;
  createdAt: number;
}

export function AdminQuestionSetsTable({
  sets,
}: {
  sets: AdminQuestionSetRow[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sets;
    return sets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.ownerDisplayName ?? "").toLowerCase().includes(q),
    );
  }, [sets, query]);

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/question-sets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Delete failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Search"
        placeholder="Filter by name or owner"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}
      <Card>
        <ul className="divide-y divide-brand-line">
          {filtered.length === 0 && (
            <li className="p-5 text-text-muted text-sm">No sets match.</li>
          )}
          {filtered.map((s) => (
            <li key={s.setId} className="flex items-center gap-4 p-4 flex-wrap">
              <div className="flex-1 min-w-[12rem]">
                <div className="text-text-primary">{s.name}</div>
                <div className="text-xs text-text-faint">
                  {s.questionCount} question
                  {s.questionCount === 1 ? "" : "s"} · owner{" "}
                  {s.ownerDisplayName ? `@${s.ownerDisplayName}` : "—"}
                </div>
              </div>
              <ConfirmDestructive
                trigger={
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === s.setId}
                  >
                    Delete
                  </Button>
                }
                title="Delete question set"
                description={`Permanently remove ${s.name}.`}
                confirmPhrase={s.name}
                actionLabel="Delete set"
                onConfirm={() => handleDelete(s.setId)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
