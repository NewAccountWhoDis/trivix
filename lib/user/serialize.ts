import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import type { SerializedUser } from "@/types/firestore";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return 0;
}

function tsToMsOrNull(value: unknown): number | null {
  if (value == null) return null;
  return tsToMs(value);
}

export function serializeUser(uid: string, raw: Record<string, unknown>): SerializedUser {
  const stats = (raw.stats as Record<string, unknown>) ?? {};
  const venues =
    (stats.venues as Array<Record<string, unknown>> | undefined) ?? [];
  return {
    uid,
    email: String(raw.email ?? ""),
    emailVerified: Boolean(raw.emailVerified),
    firstName: String(raw.firstName ?? ""),
    lastName: String(raw.lastName ?? ""),
    displayName: String(raw.displayName ?? ""),
    displayNameKey: String(raw.displayNameKey ?? ""),
    avatarSeed: String(raw.avatarSeed ?? uid),
    role: (raw.role as SerializedUser["role"]) ?? "player",
    hostStatus: (raw.hostStatus as SerializedUser["hostStatus"]) ?? "none",
    isAdmin: Boolean(raw.isAdmin),
    teamId: (raw.teamId as string | null | undefined) ?? null,
    teamHistory: (raw.teamHistory as string[] | undefined) ?? [],
    stats: {
      gamesPlayed: Number(stats.gamesPlayed ?? 0),
      gamesWon: Number(stats.gamesWon ?? 0),
      totalCorrectAnswers: Number(stats.totalCorrectAnswers ?? 0),
      totalQuestionsAnswered: Number(stats.totalQuestionsAnswered ?? 0),
      highestScore: Number(stats.highestScore ?? 0),
      currentWinStreak: Number(stats.currentWinStreak ?? 0),
      longestWinStreak: Number(stats.longestWinStreak ?? 0),
      lastPlayedAt: tsToMsOrNull(stats.lastPlayedAt),
      favoriteVenueId: (stats.favoriteVenueId as string | null | undefined) ?? null,
      favoriteTeammateUid:
        (stats.favoriteTeammateUid as string | null | undefined) ?? null,
      venues: venues.map((v) => ({
        venueId: String(v.venueId ?? ""),
        venueName: String(v.venueName ?? ""),
        gamesAttended: Number(v.gamesAttended ?? 0),
        lastVisitedAt: tsToMs(v.lastVisitedAt),
      })),
    },
    createdAt: tsToMs(raw.createdAt),
    updatedAt: tsToMs(raw.updatedAt),
  };
}
