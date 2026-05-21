"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/host-applications", label: "Host applications" },
  { href: "/admin/account-reviews", label: "Account reviews" },
  { href: "/admin/hosts", label: "Hosts" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/teams", label: "Teams" },
  { href: "/admin/venues", label: "Venues" },
  { href: "/admin/games", label: "Games" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto -mx-1 px-1">
      {TABS.map((t) => {
        const active =
          t.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "px-3 py-2 text-sm rounded-md whitespace-nowrap transition",
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
  );
}
