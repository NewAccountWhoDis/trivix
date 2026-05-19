"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils/cn";

type Tab = { href: string; label: string; requiresHost?: boolean };

const TABS: readonly Tab[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/team", label: "Team" },
  { href: "/host", label: "Host", requiresHost: true },
];

export function AppHeader() {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  const showHost = user.role === "host";

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-brand-black/80 border-b border-brand-line">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="font-display text-lg md:text-xl tracking-[3px] hover:opacity-80 transition shrink-0"
          aria-label="Trivix home"
        >
          TRIVIX
        </Link>

        <nav
          className="flex-1 flex items-center gap-1 overflow-x-auto -mx-1 px-1"
          aria-label="Primary"
        >
          {TABS.filter((t) => !t.requiresHost || showHost).map((t) => {
            const active =
              t.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition",
                  active
                    ? "bg-brand-ink text-text-primary border border-brand-line"
                    : "text-text-muted hover:text-text-primary",
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {user.isAdmin && (
            <Link
              href="/admin"
              className="hidden sm:inline-flex px-2.5 py-1 rounded-md text-xs uppercase tracking-[2px] border border-brand-line text-text-muted hover:text-text-primary hover:border-brand-red transition"
            >
              Admin
            </Link>
          )}
          {showHost && (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] uppercase tracking-[2px] border border-brand-red/40 bg-brand-red/10 text-brand-red font-medium">
              Host
            </span>
          )}
          <Link
            href="/profile"
            aria-label="Open profile"
            className="hidden sm:inline-flex items-center text-sm text-text-muted hover:text-text-primary transition"
          >
            @{user.displayName}
          </Link>
          <Link
            href="/profile"
            aria-label="Open profile"
            className="rounded-full ring-1 ring-brand-line hover:ring-brand-red transition"
          >
            <Avatar
              firstName={user.firstName}
              lastName={user.lastName}
              seed={user.avatarSeed}
              size="sm"
            />
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs uppercase tracking-[2px] px-2.5 py-1 rounded-md border border-brand-line text-text-muted hover:text-text-primary hover:border-brand-red transition disabled:opacity-50"
          >
            {signingOut ? "…" : "Sign out"}
          </button>
        </div>
      </div>
    </header>
  );
}
