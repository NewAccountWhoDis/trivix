"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { joinGameSessionSchema } from "@/lib/validation/schemas";

export function PlayJoinForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialCode = (params.get("code") ?? "").toUpperCase();
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoJoinedRef = useRef(false);

  async function joinWith(rawCode: string): Promise<void> {
    setError(null);
    const parsed = joinGameSessionSchema.safeParse({ sessionCode: rawCode });
    if (!parsed.success) {
      setError("Codes are 6 characters: A–Z, 2–9 (no O, I, L).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/games/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Join failed");
      }
      const body = (await res.json()) as { sessionId: string };
      router.push(`/play/${body.sessionId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-submit when arriving with ?code=... (QR deep-link).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (autoJoinedRef.current) return;
    if (!initialCode) return;
    if (initialCode.length !== 6) return;
    autoJoinedRef.current = true;
    void joinWith(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void joinWith(code);
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-text-muted hover:text-text-primary"
        >
          ← Dashboard
        </Link>
      </div>
      <h1 className="font-display text-4xl tracking-[3px] mb-2">PLAY</h1>
      <p className="text-text-muted mb-8">
        {initialCode && submitting
          ? `Joining ${initialCode}…`
          : "Enter the 6-character code your host shared."}
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Session code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          placeholder="ABCD23"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-display text-2xl tracking-[6px] uppercase"
          required
          autoFocus
        />
        {error && (
          <div
            role="alert"
            className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
          >
            {error}
          </div>
        )}
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? "Joining…" : "Join game"}
        </Button>
      </form>
    </main>
  );
}
