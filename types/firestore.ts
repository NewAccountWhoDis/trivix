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
  phone: string | null;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  displayNameKey: string;
  avatarSeed: string;
  role: Role;
  hostStatus: HostStatus;
  /** uid of the main host this account works under. null = main host or non-host. */
  mainHostUid: string | null;
  /** Main host only. Date when host status auto-expires. */
  hostExpiresAt: FirestoreTimestamp | null;
  /** Main host only. Max sub-hosts admin allows. */
  subHostCap: number;
  /** Main host only. Denormalized list of approved sub-host uids. */
  subHostUids: string[];
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
  phone: string | null;
  phoneVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string;
  displayNameKey: string;
  avatarSeed: string;
  role: Role;
  hostStatus: HostStatus;
  mainHostUid: string | null;
  hostExpiresAt: number | null;
  subHostCap: number;
  subHostUids: string[];
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

export interface TeamGameSummary {
  sessionId: string;
  venueNameSnapshot: string;
  finalRank: number;
  totalTeams: number;
  teamScore: number;
  playedAt: FirestoreTimestamp;
}

export interface TeamStats {
  gamesPlayed: number;
  gamesWon: number;
  lastPlayedAt: FirestoreTimestamp | null;
  /** Capped at 25 most recent, newest first. */
  recentGames: TeamGameSummary[];
}

export interface TeamDoc {
  teamId: string;
  name: string;
  inviteCode: string;
  captainUid: string | null;
  memberUids: string[];
  createdBy: string;
  stats: TeamStats;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export const DEFAULT_TEAM_STATS: TeamStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  lastPlayedAt: null,
  recentGames: [],
};

export interface JoinRequestDoc {
  uid: string;
  displayName: string;
  requestedAt: FirestoreTimestamp;
}

export interface SerializedTeamGameSummary {
  sessionId: string;
  venueNameSnapshot: string;
  finalRank: number;
  totalTeams: number;
  teamScore: number;
  playedAt: number;
}

export interface SerializedTeamStats {
  gamesPlayed: number;
  gamesWon: number;
  lastPlayedAt: number | null;
  recentGames: SerializedTeamGameSummary[];
}

/** Plain-JSON form of TeamDoc for client consumption. */
export interface SerializedTeam {
  teamId: string;
  name: string;
  inviteCode: string;
  captainUid: string | null;
  memberUids: string[];
  createdBy: string;
  stats: SerializedTeamStats;
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

export interface Question {
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  points: number;
}

export interface QuestionSetDoc {
  setId: string;
  ownerUid: string;
  name: string;
  description: string | null;
  questions: Question[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/** Plain-JSON form of QuestionSetDoc safe to pass server→client. */
export interface SerializedQuestionSet {
  setId: string;
  ownerUid: string;
  name: string;
  description: string | null;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
}

export type GameSessionStatus = "lobby" | "active" | "ended";

/**
 * Player-safe question shape stored on `gameSessions/{id}`. `correctIndex`
 * is null until the host advances past that question; the server then
 * copies the real value over from `gameSessionKeys/{id}`. Lets players
 * subscribe via `onSnapshot` without ever seeing future answers.
 */
export interface SanitizedQuestion {
  prompt: string;
  choices: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3 | null;
  points: number;
}

/**
 * Host/admin-only mirror that holds the full answer key. Server-only
 * writes; deleted after game-end finalization.
 */
export interface GameSessionKeyDoc {
  sessionId: string;
  hostUid: string;
  questions: Question[];
  createdAt: FirestoreTimestamp;
}

export interface SerializedGameSessionKey {
  sessionId: string;
  hostUid: string;
  questions: Question[];
  createdAt: number;
}

export interface PlayerAnswer {
  choiceIndex: number;
  correct: boolean;
  points: number;
  answeredAt: FirestoreTimestamp;
}

export interface GameSessionPlayer {
  uid: string;
  displayName: string;
  joinedAt: FirestoreTimestamp;
  score: number;
  /** Snapshotted at join time. Null = free agent. */
  teamId: string | null;
  /** Snapshotted at join time so a later team rename doesn't desync UI. */
  teamNameSnapshot: string | null;
  /** Keyed by question index (as string for Firestore map keys). */
  answers: Record<string, PlayerAnswer>;
}

export interface GameSessionDoc {
  sessionId: string;
  hostUid: string;
  venueId: string;
  venueNameSnapshot: string;
  questionSetId: string;
  questionSetNameSnapshot: string;
  /** Sanitized questions — `correctIndex` filled in only after reveal. */
  questions: SanitizedQuestion[];
  status: GameSessionStatus;
  /** -1 in lobby; 0..N-1 while active; equals questions.length once ended. */
  currentQuestionIndex: number;
  /** Max question index whose correct answer has been revealed; -1 = none. */
  revealedIndex: number;
  sessionCode: string;
  /** Keyed by player uid — lets us atomically update one player at a time. */
  players: Record<string, GameSessionPlayer>;
  /** Server-set absolute deadline for the current question. Null in lobby/ended. */
  currentQuestionDeadline: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp;
  startedAt: FirestoreTimestamp | null;
  endedAt: FirestoreTimestamp | null;
}

export interface SerializedPlayerAnswer {
  choiceIndex: number;
  correct: boolean;
  points: number;
  answeredAt: number;
}

export interface SerializedGameSessionPlayer {
  uid: string;
  displayName: string;
  joinedAt: number;
  score: number;
  teamId: string | null;
  teamNameSnapshot: string | null;
  answers: Record<string, SerializedPlayerAnswer>;
}

/** Plain-JSON form of GameSessionDoc safe to pass server→client. */
export interface SerializedGameSession {
  sessionId: string;
  hostUid: string;
  venueId: string;
  venueNameSnapshot: string;
  questionSetId: string;
  questionSetNameSnapshot: string;
  questions: SanitizedQuestion[];
  status: GameSessionStatus;
  currentQuestionIndex: number;
  revealedIndex: number;
  sessionCode: string;
  players: Record<string, SerializedGameSessionPlayer>;
  currentQuestionDeadline: number | null;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
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
