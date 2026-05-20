"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TrivixLogo } from "@/components/brand/TrivixLogo";
import { Avatar } from "@/components/ui/Avatar";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils/cn";

type Tab = { href: string; label: string; requiresHost?: boolean };

const TABS: readonly Tab[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/team", label: "Team" },
  { href: "/host", label: "Host", requiresHost: true },
  { href: "/faq", label: "FAQ" },
];

export function AppHeader() {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prevPath, setPrevPath] = useState(pathname);
  const menuRef = useRef<HTMLDivElement>(null);

  if (pathname !== prevPath) {
    setPrevPath(pathname);
    setMenuOpen(false);
  }

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
  const visibleTabs = TABS.filter((t) => !t.requiresHost || showHost);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-brand-black/80 border-b border-brand-line">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
        <Link
          href="/dashboard"
          className="hover:opacity-85 transition shrink-0"
          aria-label="Trivix home"
        >
          <TrivixLogo size="sm" ariaHidden />
        </Link>

        <nav
          className="hidden md:flex flex-1 items-center gap-1 overflow-x-auto -mx-1 px-1"
          aria-label="Primary"
        >
          {visibleTabs.map((t) => {
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

        {/* Desktop right section */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {user.isAdmin && (
            <Link
              href="/admin"
              className="inline-flex px-2.5 py-1 rounded-md text-xs uppercase tracking-[2px] border border-brand-line text-text-muted hover:text-text-primary hover:border-brand-red transition"
            >
              Admin
            </Link>
          )}
          {showHost && (
            <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] uppercase tracking-[2px] border border-brand-red/40 bg-brand-red/10 text-brand-red font-medium">
              Host
            </span>
          )}
          <Link
            href="/profile"
            aria-label="Open profile"
            className="inline-flex items-center text-sm text-text-muted hover:text-text-primary transition"
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

        {/* Mobile menu */}
        <div ref={menuRef} className="md:hidden ml-auto relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm uppercase tracking-[2px] border border-brand-line text-text-primary hover:border-brand-red transition"
          >
            Menu
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
              className={cn("transition-transform", menuOpen && "rotate-180")}
            >
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 rounded-lg border border-brand-line bg-brand-black/95 backdrop-blur shadow-lg p-1.5 flex flex-col gap-0.5"
            >
              <div className="flex items-center gap-2 px-2.5 py-2 border-b border-brand-line mb-1">
                <Avatar
                  firstName={user.firstName}
                  lastName={user.lastName}
                  seed={user.avatarSeed}
                  size="sm"
                />
                <span className="text-sm text-text-primary truncate">
                  @{user.displayName}
                </span>
                {showHost && (
                  <span className="ml-auto inline-flex px-1.5 py-0.5 rounded-md text-[10px] uppercase tracking-[1px] border border-brand-red/40 bg-brand-red/10 text-brand-red font-medium">
                    Host
                  </span>
                )}
              </div>

              {visibleTabs.map((t) => {
                const active =
                  t.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(t.href);
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    role="menuitem"
                    className={cn(
                      "px-2.5 py-2 text-sm rounded-md transition",
                      active
                        ? "bg-brand-ink text-text-primary"
                        : "text-text-muted hover:text-text-primary hover:bg-brand-ink/60",
                    )}
                  >
                    {t.label}
                  </Link>
                );
              })}

              {user.isAdmin && (
                <Link
                  href="/admin"
                  role="menuitem"
                  className="px-2.5 py-2 text-sm rounded-md uppercase tracking-[2px] text-text-muted hover:text-text-primary hover:bg-brand-ink/60 transition"
                >
                  Admin
                </Link>
              )}

              <Link
                href="/profile"
                role="menuitem"
                className="px-2.5 py-2 text-sm rounded-md text-text-muted hover:text-text-primary hover:bg-brand-ink/60 transition"
              >
                Profile
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                role="menuitem"
                className="mt-1 px-2.5 py-2 text-sm text-left rounded-md uppercase tracking-[2px] border-t border-brand-line text-text-muted hover:text-text-primary hover:bg-brand-ink/60 transition disabled:opacity-50"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
