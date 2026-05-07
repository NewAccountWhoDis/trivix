"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";

export interface AdminTeamRow {
  teamId: string;
  name: string;
  inviteCode: string;
  captainUid: string | null;
  captainDisplayName: string | null;
  memberCount: number;
  createdAt: number;
}

export function TeamsTable({ teams }: { teams: AdminTeamRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.inviteCode.toLowerCase().includes(q),
    );
  }, [teams, query]);

  async function disband(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Disband failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disband failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Search"
        placeholder="Filter by name or invite code"
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
            <li className="p-5 text-text-muted text-sm">No teams match.</li>
          )}
          {filtered.map((t) => (
            <li
              key={t.teamId}
              className="flex items-center gap-4 p-4 flex-wrap"
            >
              <div className="flex-1 min-w-[10rem]">
                <div className="text-text-primary">{t.name}</div>
                <div className="text-xs text-text-faint">
                  {t.memberCount} member{t.memberCount === 1 ? "" : "s"} ·
                  captain{" "}
                  {t.captainDisplayName ? `@${t.captainDisplayName}` : "—"}
                </div>
              </div>
              <div className="font-display text-sm tracking-[4px] text-text-muted">
                {t.inviteCode}
              </div>
              <ConfirmDestructive
                trigger={
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === t.teamId}
                  >
                    Disband
                  </Button>
                }
                title="Disband team"
                description={`Remove ${t.name} permanently. All members will lose their team affiliation.`}
                confirmPhrase={t.name}
                actionLabel="Disband team"
                onConfirm={() => disband(t.teamId)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
