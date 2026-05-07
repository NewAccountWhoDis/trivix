"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/hooks/useUser";
import { signOutClient } from "@/lib/auth/client";

export default function DashboardPage() {
  const user = useUser();

  async function handleSignOut() {
    await signOutClient();
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-4xl mx-auto">
      <header className="flex items-center gap-4 mb-10">
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          seed={user.avatarSeed}
          size="md"
        />
        <div className="flex-1">
          <p className="text-text-muted text-sm">Welcome back,</p>
          <h1 className="font-display text-3xl tracking-[3px]">
            {user.firstName.toUpperCase()}
          </h1>
        </div>
        <Button variant="ghost" onClick={handleSignOut}>
          Sign out
        </Button>
      </header>

      {user.role === "host" && user.hostStatus === "pending" && (
        <Card className="mb-6">
          <div className="flex items-start gap-3 p-5">
            <Badge tone="pending">pending</Badge>
            <div>
              <div className="font-medium">Host application under review</div>
              <p className="text-sm text-text-muted mt-1">
                We&apos;ll email you once an admin approves your application.
                You can play in the meantime.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/profile" className="block">
          <Card
            variant="elevated"
            className="p-5 hover:border-brand-red transition cursor-pointer"
          >
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Profile
            </div>
            <div className="font-display text-2xl tracking-[2px]">
              @{user.displayName}
            </div>
            <p className="text-sm text-text-muted mt-2">
              View and edit your profile.
            </p>
          </Card>
        </Link>

        <Link href="/team" className="block">
          <Card
            variant="elevated"
            className="p-5 hover:border-brand-red transition cursor-pointer"
          >
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Team
            </div>
            <div className="font-display text-2xl tracking-[2px]">
              {user.teamId ? "Your team" : "No team yet"}
            </div>
            <p className="text-sm text-text-muted mt-2">
              {user.teamId ? "Manage your crew." : "Create a team or join one."}
            </p>
          </Card>
        </Link>

        <Link href="/play" className="block">
          <Card
            variant="elevated"
            className="p-5 hover:border-brand-red transition cursor-pointer"
          >
            <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
              Play
            </div>
            <div className="font-display text-2xl tracking-[2px]">
              Join a game
            </div>
            <p className="text-sm text-text-muted mt-2">
              Got a code from your host? Hop in.
            </p>
          </Card>
        </Link>

        {user.role === "host" && user.hostStatus === "approved" && (
          <Link href="/host" className="block sm:col-span-2">
            <Card variant="neon" className="p-5 cursor-pointer">
              <div className="text-xs uppercase tracking-[3px] text-text-faint mb-2">
                Host
              </div>
              <div className="font-display text-2xl tracking-[2px]">
                Host tools
              </div>
              <p className="text-sm text-text-muted mt-2">
                Run a trivia night.
              </p>
            </Card>
          </Link>
        )}
      </div>
    </main>
  );
}
