import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { toDisplayNameKey } from "@/lib/validation/schemas";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ displayName: string }>;
}) {
  const { displayName } = await params;
  const key = toDisplayNameKey(displayName);

  const dnSnap = await adminDb.collection("displayNames").doc(key).get();
  if (!dnSnap.exists) notFound();

  const uid = String(dnSnap.data()?.uid ?? "");
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) notFound();

  const u = userSnap.data() ?? {};
  const stats = (u.stats as Record<string, unknown>) ?? {};
  const profile = {
    displayName: String(u.displayName ?? ""),
    avatarSeed: String(u.avatarSeed ?? uid),
    role: (u.role as "player" | "host") ?? "player",
    hostStatus: (u.hostStatus as string) ?? "none",
    createdAt: tsToMs(u.createdAt),
    stats: {
      gamesPlayed: Number(stats.gamesPlayed ?? 0),
      gamesWon: Number(stats.gamesWon ?? 0),
      longestWinStreak: Number(stats.longestWinStreak ?? 0),
      highestScore: Number(stats.highestScore ?? 0),
    },
  };

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-3xl mx-auto">
      <div className="flex items-start gap-6 mb-10">
        <Avatar
          seed={profile.avatarSeed}
          firstName={profile.displayName[0] ?? ""}
          size="lg"
        />
        <div className="flex-1">
          <h1 className="font-display text-4xl tracking-[3px]">
            @{profile.displayName.toUpperCase()}
          </h1>
          <p className="text-text-muted">
            Joined{" "}
            {profile.createdAt
              ? new Date(profile.createdAt).toLocaleDateString()
              : "—"}
          </p>
          <div className="flex gap-2 mt-3">
            {profile.role === "host" && profile.hostStatus === "approved" && (
              <Badge tone="host">host</Badge>
            )}
          </div>
        </div>
      </div>

      <h2 className="font-display text-2xl tracking-[3px] mb-3">STATS</h2>
      <Card>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
          <Stat label="Games" value={profile.stats.gamesPlayed} />
          <Stat label="Wins" value={profile.stats.gamesWon} />
          <Stat label="Best score" value={profile.stats.highestScore} />
          <Stat label="Longest streak" value={profile.stats.longestWinStreak} />
        </div>
      </Card>
    </main>
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
