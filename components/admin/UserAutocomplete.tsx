"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";

export interface UserAutocompleteHit {
  uid: string;
  displayName: string;
  email: string;
  role: "player" | "host";
  hostStatus: "none" | "pending" | "approved" | "denied";
  mainHostUid: string | null;
  isAdmin: boolean;
}

export function UserAutocomplete({
  label,
  hint,
  placeholder,
  value,
  onSelect,
  onClear,
  filter,
}: {
  label?: string;
  hint?: string;
  placeholder?: string;
  value: UserAutocompleteHit | null;
  onSelect: (hit: UserAutocompleteHit) => void;
  onClear: () => void;
  /** Optional client-side filter. Hits where filter returns false are hidden. */
  filter?: (hit: UserAutocompleteHit) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserAutocompleteHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) return; // Selected; don't search.
    const q = query.trim();
    if (q.length < 2) {
      setResults([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/users/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q }),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          setResults([]);
          return;
        }
        const body = (await res.json()) as { results: UserAutocompleteHit[] };
        const filtered = filter
          ? body.results.filter(filter)
          : body.results;
        setResults(filtered);
        setOpen(true);
      } catch {
        // aborted
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, value, filter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  if (value) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <span className="text-sm font-medium text-text-muted">{label}</span>
        )}
        <div className="flex items-center justify-between gap-3 px-4 h-11 rounded-md bg-brand-ink border border-brand-line">
          <span className="text-text-primary truncate">
            @{value.displayName}{" "}
            <span className="text-text-faint">· {value.email}</span>
          </span>
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Change
          </button>
        </div>
        {hint && <p className="text-xs text-text-faint">{hint}</p>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        label={label}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "Type a username or email"}
        hint={hint}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-20 left-0 right-0 mt-1 rounded-md bg-brand-black border border-brand-line shadow-lg max-h-72 overflow-auto">
          {loading && (
            <div className="px-4 py-2 text-xs text-text-faint">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-4 py-2 text-xs text-text-faint">
              No matches.
            </div>
          )}
          {results.map((r) => (
            <button
              key={r.uid}
              type="button"
              onClick={() => {
                onSelect(r);
                setOpen(false);
                setQuery("");
                setResults([]);
              }}
              className="w-full text-left px-4 py-2 hover:bg-brand-ink transition flex items-center justify-between gap-3"
            >
              <span>
                <span className="text-text-primary">@{r.displayName}</span>
                <span className="text-text-faint"> · {r.email}</span>
              </span>
              {r.role === "host" && r.hostStatus === "approved" && (
                <span className="text-[10px] uppercase tracking-[2px] text-brand-red">
                  {r.mainHostUid ? "sub host" : "main host"}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
