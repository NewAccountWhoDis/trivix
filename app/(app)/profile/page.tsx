"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/hooks/useUser";

export default function ProfilePage() {
  const user = useUser();

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <div className="flex items-start gap-6 mb-10">
        <Avatar
          firstName={user.firstName}
          lastName={user.lastName}
          seed={user.avatarSeed}
          size="lg"
        />
        <div className="flex-1">
          <h1 className="font-display text-4xl tracking-[3px]">
            {user.firstName.toUpperCase()} {user.lastName.toUpperCase()}
          </h1>
          <p className="text-text-muted">@{user.displayName}</p>
          <div className="flex gap-2 mt-3">
            {user.role === "host" && (
              <Badge tone={user.hostStatus === "approved" ? "host" : "pending"}>
                {user.hostStatus === "approved" ? "host" : "host • pending"}
              </Badge>
            )}
            {user.isAdmin && <Badge tone="pro">admin</Badge>}
          </div>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/profile/edit">Edit</Link>
        </Button>
      </div>

      <Card className="mb-6">
        <div className="grid sm:grid-cols-2 gap-4 p-5">
          <Field label="Email" value={user.email} />
          <Field
            label="Email verified"
            value={user.emailVerified ? "Yes" : "No"}
          />
          <Field label="Username" value={`@${user.displayName}`} />
          <Field
            label="Joined"
            value={new Date(user.createdAt).toLocaleDateString()}
          />
        </div>
      </Card>

      <h2 className="font-display text-2xl tracking-[3px] mb-3">STATS</h2>
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
          <Stat label="Games" value={user.stats.gamesPlayed} />
          <Stat label="Wins" value={user.stats.gamesWon} />
          <Stat label="Best score" value={user.stats.highestScore} />
          <Stat label="Longest streak" value={user.stats.longestWinStreak} />
        </div>
      </Card>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[3px] text-text-faint mb-1">
        {label}
      </div>
      <div className="text-text-primary">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-display text-3xl">{value}</div>
      <div className="text-xs uppercase tracking-[3px] text-text-faint mt-1">
        {label}
      </div>
    </div>
  );
}
