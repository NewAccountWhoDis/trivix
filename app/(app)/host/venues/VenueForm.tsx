"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { createVenueSchema } from "@/lib/validation/schemas";

interface VenueValues {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY: VenueValues = {
  name: "",
  street: "",
  city: "",
  state: "",
  zip: "",
};

export function VenueForm({
  mode,
  venueId,
  initial,
}: {
  mode: "create" | "edit";
  venueId?: string;
  initial?: VenueValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<VenueValues>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = createVenueSchema.safeParse({
      name: v.name,
      address: {
        street: v.street,
        city: v.city,
        state: v.state,
        zip: v.zip,
      },
    });
    if (!parsed.success) {
      setError("Fix the highlighted fields.");
      return;
    }
    setSubmitting(true);
    try {
      const url = mode === "create" ? "/api/venues" : `/api/venues/${venueId}`;
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
      router.push("/host");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Venue name"
        value={v.name}
        onChange={(e) => setV({ ...v, name: e.target.value })}
        maxLength={60}
        placeholder="Joe's Pub"
        required
        autoFocus
      />
      <Input
        label="Street"
        value={v.street}
        onChange={(e) => setV({ ...v, street: e.target.value })}
        maxLength={100}
        placeholder="123 Main St"
        required
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Input
          label="City"
          value={v.city}
          onChange={(e) => setV({ ...v, city: e.target.value })}
          maxLength={50}
          placeholder="Albany"
          required
        />
        <Input
          label="State"
          value={v.state}
          onChange={(e) => setV({ ...v, state: e.target.value.toUpperCase() })}
          maxLength={2}
          placeholder="NY"
          className="uppercase"
          required
        />
        <Input
          label="ZIP"
          value={v.zip}
          onChange={(e) => setV({ ...v, zip: e.target.value })}
          maxLength={10}
          placeholder="12207"
          required
        />
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
          <Link href="/host">Cancel</Link>
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
              ? "Add venue"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
