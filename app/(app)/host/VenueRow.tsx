"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";

export function VenueRow({
  venue,
}: {
  venue: {
    venueId: string;
    name: string;
    address: { street: string; city: string; state: string; zip: string };
    ownedByMe?: boolean;
    ownerDisplayName?: string | null;
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/venues/${venue.venueId}`, {
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-text-primary">{venue.name}</span>
          {venue.ownedByMe === false && venue.ownerDisplayName && (
            <span className="text-[10px] uppercase tracking-[2px] px-1.5 py-0.5 rounded border border-brand-line text-text-muted">
              shared · @{venue.ownerDisplayName}
            </span>
          )}
        </div>
        <div className="text-xs text-text-faint">
          {venue.address.street}, {venue.address.city}, {venue.address.state}{" "}
          {venue.address.zip}
        </div>
        {error && <div className="mt-2 text-xs text-game-red">{error}</div>}
      </div>
      {venue.ownedByMe !== false && (
        <div className="flex gap-2 shrink-0">
          <Button size="sm" variant="secondary" asChild>
            <Link href={`/host/venues/${venue.venueId}/edit`}>Edit</Link>
          </Button>
          <ConfirmDestructive
            trigger={
              <Button size="sm" variant="danger" disabled={busy}>
                Delete
              </Button>
            }
            title="Delete venue"
            description={`Permanently remove ${venue.name}.`}
            confirmPhrase={venue.name}
            actionLabel="Delete venue"
            onConfirm={handleDelete}
          />
        </div>
      )}
    </li>
  );
}
