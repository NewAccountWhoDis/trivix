"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";

export interface AdminVenueRow {
  venueId: string;
  ownerUid: string;
  ownerDisplayName: string | null;
  name: string;
  address: { street: string; city: string; state: string; zip: string };
  createdAt: number;
}

export function AdminVenuesTable({ venues }: { venues: AdminVenueRow[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return venues;
    return venues.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.address.city.toLowerCase().includes(q) ||
        (v.ownerDisplayName ?? "").toLowerCase().includes(q),
    );
  }, [venues, query]);

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/venues/${id}`, { method: "DELETE" });
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
        placeholder="Filter by name, city, or owner"
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
            <li className="p-5 text-text-muted text-sm">No venues match.</li>
          )}
          {filtered.map((v) => (
            <li
              key={v.venueId}
              className="flex items-center gap-4 p-4 flex-wrap"
            >
              <div className="flex-1 min-w-[12rem]">
                <div className="text-text-primary">{v.name}</div>
                <div className="text-xs text-text-faint">
                  {v.address.city}, {v.address.state} · owner{" "}
                  {v.ownerDisplayName ? `@${v.ownerDisplayName}` : "—"}
                </div>
              </div>
              <ConfirmDestructive
                trigger={
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busyId === v.venueId}
                  >
                    Delete
                  </Button>
                }
                title="Delete venue"
                description={`Permanently remove ${v.name}.`}
                confirmPhrase={v.name}
                actionLabel="Delete venue"
                onConfirm={() => handleDelete(v.venueId)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
