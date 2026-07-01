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
  /** Set when the user has clicked "Request account deletion". */
  deletionRequestedAt: FirestoreTimestamp | null;
  /** Admin has confirmed the account is to be removed. The Firebase Auth
   *  user may still exist briefly until the admin deletes it manually. */
  archived: boolean;
  archivedAt: FirestoreTimestamp | null;
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
  deletionRequestedAt: number | null;
  archived: boolean;
  archivedAt: number | null;
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
  /** Venues this team has played at, with per-venue play counts. */
  venues: VenueSummary[];
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
  venues: [],
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
  venues: Array<Omit<VenueSummary, "lastVisitedAt"> & { lastVisitedAt: number }>;
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

/**
 * Authored game content. Replaces the old flat question sets with a
 * sectioned structure and per-game host assignment.
 *
 * - `ownerUid` is the creator (a main host). Only the owner or an admin may
 *   edit/delete the game or change its assigned hosts.
 * - `hostUids` always includes the owner plus any assigned sub-hosts. Assigned
 *   sub-hosts get view + Start access only. Owners may assign only sub-hosts on
 *   their own account (their `subHostUids`).
 */
export type GameQuestionFormat = "choice" | "typed";

export interface GameQuestion {
  /** Stable local id for editing/reordering within a section. */
  id: string;
  format: GameQuestionFormat;
  prompt: string;
  /** Points awarded per correct answer. */
  points: number;
  /** `choice` format: exactly 4 options, one correct. */
  choices?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  /** `typed` format: 1+ accepted answers; each correct match scores points. */
  acceptedAnswers?: string[];
  /**
   * Number of answer slots shown to the player. `typed` quiz questions derive
   * this from `acceptedAnswers.length`; scorecard questions (no answer key)
   * carry it explicitly since the host grades manually.
   */
  answerCount?: number;
}

/**
 * Per-section answer reveal timing.
 * - `per-question` (default): host reveals each question's answer as it's played.
 * - `end-of-round`: players see "answer locked" between questions; all answers in
 *   the section are revealed together at the round break.
 */
export type SectionRevealMode = "per-question" | "end-of-round";

/**
 * - `quiz`: full authored trivia — sections of choice/typed questions with a
 *   stored answer key, played and auto/host-graded inside Trivix.
 * - `scorecard`: structure only — rounds of answer slots + points, no stored
 *   questions or answer key. Trivia is run outside Trivix; the host grades
 *   each round's submitted answers manually. Missing/undefined = `quiz`.
 */
export type GameKind = "quiz" | "scorecard";

export interface GameSection {
  id: string;
  theme: string;
  questions: GameQuestion[];
  revealMode?: SectionRevealMode;
}

export interface GameDoc {
  gameId: string;
  ownerUid: string;
  /** Owner + assigned sub-hosts. Determines who can view/Start the game. */
  hostUids: string[];
  name: string;
  kind?: GameKind;
  sections: GameSection[];
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/** Plain-JSON form of GameDoc safe to pass server→client. */
export interface SerializedGame {
  gameId: string;
  ownerUid: string;
  hostUids: string[];
  name: string;
  kind?: GameKind;
  sections: GameSection[];
  createdAt: number;
  updatedAt: number;
}

export type GameSessionStatus = "lobby" | "active" | "ended";

/**
 * Player-safe question shape stored on `gameSessions/{id}`, built by flattening
 * an authored game's sections. Answers are hidden (`correctIndex`/`acceptedAnswers`
 * null) until the host reveals the question; the server then copies the real
 * values from `gameSessionKeys/{id}`. Lets players subscribe via `onSnapshot`
 * without seeing answers early.
 */
export interface SanitizedQuestion {
  format: GameQuestionFormat;
  /** Section theme snapshot. */
  theme: string;
  /** 0-based section order; used to render round breaks. */
  sectionIndex: number;
  prompt: string;
  points: number;
  /** choice only. */
  choices?: [string, string, string, string];
  /** choice only — null until revealed. */
  correctIndex?: 0 | 1 | 2 | 3 | null;
  /** typed only — number of answer slots shown to the player. */
  answerCount?: number;
  /** typed only — null until revealed. */
  acceptedAnswers?: string[] | null;
}

/** Host/admin-only answer-key entry. */
export interface SessionKeyQuestion {
  format: GameQuestionFormat;
  points: number;
  choices?: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  acceptedAnswers?: string[];
}

/**
 * Host/admin-only mirror that holds the full answer key. Server-only
 * writes; deleted after game-end finalization.
 */
export interface GameSessionKeyDoc {
  sessionId: string;
  hostUid: string;
  questions: SessionKeyQuestion[];
  /**
   * Host-only record of the approved (normalized) answers per graded question
   * index. Lets the host re-seed the grading toggles when re-scoring a round.
   */
  approvals?: Record<string, string[]>;
  createdAt: FirestoreTimestamp;
}

export interface SerializedGameSessionKey {
  sessionId: string;
  hostUid: string;
  questions: SessionKeyQuestion[];
  approvals?: Record<string, string[]>;
  createdAt: number;
}

/** A player's answer to one question. Typed answers are scored at grade time. */
export interface PlayerAnswer {
  format: GameQuestionFormat;
  /** choice only. */
  choiceIndex?: number;
  /** typed only — what the player typed into their slots. */
  typedAnswers?: string[];
  /** Filled at submit for choice; at host grade-lock for typed. */
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
  /** Presence heartbeat — updated periodically while the player is live. */
  lastSeenAt: FirestoreTimestamp | null;
  /** Keyed by question index (as string for Firestore map keys). */
  answers: Record<string, PlayerAnswer>;
}

/**
 * A pending "take over as captain" request. Resolves when the current captain
 * responds, or auto-approves once `deadlineMs` (30s after the request) passes.
 */
export interface SessionTakeoverRequest {
  requesterUid: string;
  requesterName: string;
  /** Epoch ms; the request auto-approves once the clock passes this. */
  deadlineMs: number;
}

/**
 * Per-team, per-session captain state. Teams start captain-less; the first
 * member to claim becomes captain. Only the captain may submit answers.
 */
export interface SessionTeamState {
  captainUid: string | null;
  pendingTakeover: SessionTakeoverRequest | null;
}

export interface GameSessionDoc {
  sessionId: string;
  hostUid: string;
  /** True for the host-driven demo: kept out of real stats, watch-only for players. */
  isDemo?: boolean;
  venueId: string;
  venueNameSnapshot: string;
  gameId: string;
  gameNameSnapshot: string;
  /** Sanitized questions — answers filled in only after reveal. */
  questions: SanitizedQuestion[];
  status: GameSessionStatus;
  /** -1 in lobby; 0..N-1 while active; equals questions.length once ended. */
  currentQuestionIndex: number;
  /** Max question index whose answer has been revealed; -1 = none. */
  revealedIndex: number;
  /** Max question index whose scoring is locked; -1 = none. */
  gradedIndex: number;
  /** True while paused on the between-sections leaderboard break. */
  atBreak: boolean;
  sessionCode: string;
  /** Keyed by player uid — lets us atomically update one player at a time. */
  players: Record<string, GameSessionPlayer>;
  /** Keyed by teamId — captain + takeover state for each team in the session. */
  teams?: Record<string, SessionTeamState>;
  createdAt: FirestoreTimestamp;
  startedAt: FirestoreTimestamp | null;
  endedAt: FirestoreTimestamp | null;
}

export interface SerializedPlayerAnswer {
  format: GameQuestionFormat;
  choiceIndex?: number;
  typedAnswers?: string[];
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
  lastSeenAt: number | null;
  answers: Record<string, SerializedPlayerAnswer>;
}

/** Plain-JSON form of GameSessionDoc safe to pass server→client. */
export interface SerializedGameSession {
  sessionId: string;
  hostUid: string;
  isDemo?: boolean;
  venueId: string;
  venueNameSnapshot: string;
  gameId: string;
  gameNameSnapshot: string;
  questions: SanitizedQuestion[];
  status: GameSessionStatus;
  currentQuestionIndex: number;
  revealedIndex: number;
  gradedIndex: number;
  atBreak: boolean;
  sessionCode: string;
  players: Record<string, SerializedGameSessionPlayer>;
  teams?: Record<string, SessionTeamState>;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
}

/** The six events an admin can subscribe to notifications for. */
export type AdminNotificationEventKey =
  | "accountDeletionRequest"
  | "accountsNeedReview"
  | "gameStarted"
  | "newHostRequest"
  | "newUserSignup"
  | "newVenueAdded";

export interface AdminChannelPrefs {
  email: boolean;
  sms: boolean;
}

/**
 * adminSettings/{adminUid} — one notification-preferences doc per admin.
 * Server-only writes. SMS is stored but not yet delivered (v1 = email only).
 */
export interface AdminSettingsDoc {
  uid: string;
  /** Destination email for notifications; null = none set. */
  email: string | null;
  /** Destination phone in E.164 (e.g. +15185551234); null = none set. */
  phone: string | null;
  events: Record<AdminNotificationEventKey, AdminChannelPrefs>;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

/**
 * userSessions/{sessionId} — one record per login, capturing IP + user-agent
 * for admin review. Server-only writes; not readable by clients (admins read
 * via the Admin SDK). `endedAt` is set on sign-out-everywhere; `expiresAt`
 * mirrors the 5-day session cookie.
 */
export interface UserSessionDoc {
  sessionId: string;
  uid: string;
  ip: string;
  userAgent: string;
  createdAt: FirestoreTimestamp;
  expiresAt: FirestoreTimestamp;
  endedAt: FirestoreTimestamp | null;
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
