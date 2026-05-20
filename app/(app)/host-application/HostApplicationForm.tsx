"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { ContactSupportModal } from "@/components/support/ContactSupportModal";

export function HostApplicationForm() {
  const router = useRouter();
  const [venueCount, setVenueCount] = useState("");
  const [frequency, setFrequency] = useState("");
  const [otherHosts, setOtherHosts] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildReason() {
    const parts = [
      ["How many venues do you plan to host trivia?", venueCount],
      ["How often?", frequency],
      ["Do you need other hosts added to your account?", otherHosts],
      ["Notes or questions for the admin team", notes],
    ] as const;
    return parts
      .filter(([, a]) => a.trim())
      .map(([q, a]) => `${q}\n${a.trim()}`)
      .join("\n\n");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const reason = buildReason();
      const res = await fetch("/api/host-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || null }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Couldn't submit.");
      }
      router.push("/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't submit.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        label="How many venues do you plan to host trivia?"
        value={venueCount}
        onChange={(e) => setVenueCount(e.target.value)}
        maxLength={200}
      />
      <Input
        label="How often?"
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
        maxLength={200}
      />
      <Input
        label="Do you need other hosts added to your account?"
        value={otherHosts}
        onChange={(e) => setOtherHosts(e.target.value)}
        maxLength={300}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">
          Notes or questions for the admin team
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={800}
          rows={4}
          className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition resize-none"
          placeholder="Anything else we should know?"
        />
      </label>

      {error && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit application"}
      </Button>

      <p className="text-sm text-text-muted text-center">
        Questions about your application,{" "}
        <ContactSupportModal
          defaultReason="Host application"
          trigger={
            <button
              type="button"
              className="text-brand-red underline hover:text-brand-red-glow transition"
            >
              contact support
            </button>
          }
        />
        .
      </p>
    </form>
  );
}
