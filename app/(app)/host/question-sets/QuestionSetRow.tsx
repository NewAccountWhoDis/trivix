"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";

export function QuestionSetRow({
  set,
}: {
  set: {
    setId: string;
    name: string;
    description: string | null;
    questionCount: number;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/question-sets/${set.setId}`, {
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
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-4 p-4 flex-wrap">
      <div className="flex-1 min-w-[12rem]">
        <div className="text-text-primary">{set.name}</div>
        <div className="text-xs text-text-faint">
          {set.questionCount} question{set.questionCount === 1 ? "" : "s"}
          {set.description ? ` · ${set.description}` : ""}
        </div>
        {error && <div className="mt-2 text-xs text-game-red">{error}</div>}
      </div>
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="secondary" asChild>
          <Link href={`/host/question-sets/${set.setId}/edit`}>Edit</Link>
        </Button>
        <ConfirmDestructive
          trigger={
            <Button size="sm" variant="danger" disabled={busy}>
              Delete
            </Button>
          }
          title="Delete question set"
          description={`Permanently remove ${set.name}.`}
          confirmPhrase={set.name}
          actionLabel="Delete set"
          onConfirm={handleDelete}
        />
      </div>
    </li>
  );
}
