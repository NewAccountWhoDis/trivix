"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

export function HostApplicationForm() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-text-muted">
          Tell us about your venue (optional)
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={5}
          className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition resize-none"
          placeholder="Where do you host? How often? Any prior experience?"
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
    </form>
  );
}
