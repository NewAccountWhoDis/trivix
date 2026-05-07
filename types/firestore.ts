/**
 * Firestore document shapes — single source of truth for client and server.
 * Spec: docs/superpowers/specs/2026-05-04-trivix-foundation-design.md §4.
 */

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

export type Role = "player" | "host";
export type HostStatus = "none" | "pending" | "approved" | "denied";
export type HostApplicationStatus = "pending" | "approved" | "denied";

export interface VenueSummary {
  venueId: string;
  venueName: string;
  gamesAttended: number;
  lastVisitedAt: FirestoreTimestamp;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalCorrectAnswers: number;
  totalQuestionsAnswered: number;
  highestScore: number;
  currentWinStreak: number;
  longestWinStreak: number;
  lastPlayedAt: FirestoreTimestamp | null;
  venues: VenueSummary[];
  favoriteVenueId: string | null;
  favoriteTeammateUid: string | null;
}

export interface UserDoc {
  uid: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  displayNameKey: string;
  avatarSeed: string;
  role: Role;
  hostStatus: HostStatus;
  isAdmin: boolean;
  teamId: string | null;
  teamHistory: string[];
  stats: UserStats;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * Plain-JSON form of UserDoc safe to pass server→client.
 * Timestamps become epoch milliseconds; nullable timestamps become null.
 */
export interface SerializedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  displayNameKey: string;
  avatarSeed: string;
  role: Role;
  hostStatus: HostStatus;
  isAdmin: boolean;
  teamId: string | null;
  teamHistory: string[];
  stats: Omit<UserStats, "lastPlayedAt" | "venues"> & {
    lastPlayedAt: number | null;
    venues: Array<
      Omit<VenueSummary, "lastVisitedAt"> & { lastVisitedAt: number }
    >;
  };
  createdAt: number;
  updatedAt: number;
}

/** Public profile payload returned by GET /api/profile/[displayName]. */
export interface PublicUserProfile {
  uid: string;
  displayName: string;
  avatarSeed: string;
  createdAt: FirestoreTimestamp;
  role: Role;
  hostStatus: HostStatus;
  teamId: string | null;
  stats: Pick<
    UserStats,
    "gamesPlayed" | "gamesWon" | "longestWinStreak" | "highestScore"
  >;
}

/** displayNames/{displayNameKey} — uniqueness sentinel. */
export interface DisplayNameDoc {
  uid: string;
}

export interface TeamDoc {
  teamId: string;
  name: string;
  inviteCode: string;
  captainUid: string | null;
  memberUids: string[];
  createdBy: string;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface JoinRequestDoc {
  uid: string;
  displayName: string;
  requestedAt: FirestoreTimestamp;
}

/** Plain-JSON form of TeamDoc for client consumption. */
export interface SerializedTeam {
  teamId: string;
  name: string;
  inviteCode: string;
  captainUid: string | null;
  memberUids: string[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/** Member summary returned by GET /api/teams/[id] (display-name + avatar only). */
export interface TeamMemberSummary {
  uid: string;
  displayName: string;
  avatarSeed: string;
  isCaptain: boolean;
}

export interface SerializedJoinRequest {
  uid: string;
  displayName: string;
  requestedAt: number;
}

export interface VenueAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface VenueDoc {
  venueId: string;
  ownerUid: string;
  name: string;
  address: VenueAddress;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/** Plain-JSON form of VenueDoc safe to pass server→client. */
export interface SerializedVenue {
  venueId: string;
  ownerUid: string;
  name: string;
  address: VenueAddress;
  createdAt: number;
  updatedAt: number;
}

export interface HostApplicationDoc {
  uid: string;
  email: string;
  displayName: string;
  reason: string | null;
  status: HostApplicationStatus;
  appliedAt: FirestoreTimestamp;
  decidedAt: FirestoreTimestamp | null;
  decidedBy: string | null;
}

/** Defaults for a freshly-created user (server-side, after signup wizard). */
export const DEFAULT_USER_STATS: Omit<UserStats, "lastPlayedAt"> & {
  lastPlayedAt: null;
} = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalCorrectAnswers: 0,
  totalQuestionsAnswered: 0,
  highestScore: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  lastPlayedAt: null,
  venues: [],
  favoriteVenueId: null,
  favoriteTeammateUid: null,
};
