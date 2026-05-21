import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(40, "Too long")
  .regex(/^[\p{L}\p{M}'\- ]+$/u, "Letters, spaces, apostrophes, hyphens only");

export const displayNameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters")
  .max(20, "20 characters max")
  .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscores only");

export const toDisplayNameKey = (s: string) => s.trim().toLowerCase();

export const signupStep1EmailSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupStep2Schema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signupStep3Schema = z.object({
  role: z.enum(["player", "host"]),
  reason: z.string().trim().max(2000).optional().nullable(),
});

// Server-side completeSignup only needs identity + role; the email/password
// credential is already linked client-side to the phone-authed user before
// the wizard reaches the role step.
export const completeSignupSchema = z
  .object({
    firstName: nameSchema,
    lastName: nameSchema,
    displayName: displayNameSchema,
  })
  .merge(signupStep3Schema);

export const checkDisplayNameSchema = z.object({
  displayName: displayNameSchema,
});

export const profileEditSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  displayName: displayNameSchema,
});

// Identifier may be a username (displayName), email, or US phone number.
// Validation is forgiving here — the resolver decides which kind it is.
export const identifierSchema = z
  .string()
  .trim()
  .min(1, "Required")
  .max(64, "Too long");

export const loginSchema = z.object({
  identifier: identifierSchema,
  password: z.string().min(1, "Required"),
});

export const forgotPasswordSchema = z.object({
  identifier: identifierSchema,
});

export const resolveIdentifierSchema = z.object({
  identifier: identifierSchema,
});

// ── Teams ───────────────────────────────────────────────────────────────────
// Invite code alphabet: A–Z + 2–9 minus ambiguous chars (O, I, L) → 31 chars.
export const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const INVITE_CODE_LENGTH = 6;
export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(INVITE_CODE_LENGTH, `Code must be ${INVITE_CODE_LENGTH} characters`)
  .regex(
    new RegExp(`^[${INVITE_CODE_ALPHABET}]+$`),
    "Code uses only A–Z and 2–9 (no O, I, L, 0, 1)",
  );

export const teamNameSchema = z
  .string()
  .trim()
  .min(2, "At least 2 characters")
  .max(40, "40 characters max")
  .regex(
    /^[\p{L}\p{M}\p{N}'\-&. ]+$/u,
    "Letters, numbers, spaces, ' - & . only",
  );

export const createTeamSchema = z.object({
  name: teamNameSchema,
});

export const joinTeamSchema = z.object({
  inviteCode: inviteCodeSchema,
});

export const transferCaptainSchema = z.object({
  uid: z.string().min(1, "Required"),
});

export const requestActionSchema = z.object({
  action: z.enum(["approve", "deny"]),
});

// ── Admin ───────────────────────────────────────────────────────────────────
export const hostApplicationActionSchema = z
  .object({
    action: z.enum(["approve", "deny"]),
    mainHostUid: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .optional()
      .nullable(),
    // ISO date string (YYYY-MM-DD) when this approval makes a new main host.
    hostExpiresAt: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
      .optional()
      .nullable(),
    subHostCap: z.number().int().min(0).max(100).optional(),
  })
  .refine(
    (v) =>
      v.action !== "approve" ||
      v.mainHostUid ||
      (v.hostExpiresAt && typeof v.subHostCap === "number"),
    {
      message:
        "Main host approvals require hostExpiresAt and subHostCap; sub-host approvals require mainHostUid.",
    },
  );

export const userActionSchema = z.object({
  action: z.enum(["revoke-host", "delete", "signout-everywhere"]),
});

export const editHostSchema = z.object({
  mainHostUid: z.string().trim().min(1).max(128).optional().nullable(),
  hostExpiresAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable(),
  subHostCap: z.number().int().min(0).max(100).optional(),
});

export const userSearchSchema = z.object({
  q: z.string().trim().min(2, "At least 2 characters").max(64),
});

export const addSubHostSchema = z.object({
  uid: z.string().trim().min(1).max(128),
});

export const requestHostAccessSchema = z.object({
  reason: z.string().trim().max(2000).optional().nullable(),
});

// ── Venues ──────────────────────────────────────────────────────────────────
export const venueNameSchema = z
  .string()
  .trim()
  .min(2, "At least 2 characters")
  .max(60, "60 characters max");

export const venueAddressSchema = z.object({
  street: z.string().trim().min(2, "Required").max(100, "100 characters max"),
  city: z.string().trim().min(2, "Required").max(50, "50 characters max"),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Use a 2-letter state code"),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, "Use a 5-digit ZIP (or ZIP+4 with hyphen)"),
});

export const createVenueSchema = z.object({
  name: venueNameSchema,
  address: venueAddressSchema,
});

export const updateVenueSchema = createVenueSchema;

// ── Games (authored content) ────────────────────────────────────────────────
export const gameNameSchema = z
  .string()
  .trim()
  .min(2, "At least 2 characters")
  .max(60, "60 characters max");

const gamePromptSchema = z
  .string()
  .trim()
  .min(5, "At least 5 characters")
  .max(500, "500 characters max");

const gamePointsSchema = z.number().int().min(1).max(10);

const choiceQuestionSchema = z.object({
  id: z.string().min(1),
  format: z.literal("choice"),
  prompt: gamePromptSchema,
  points: gamePointsSchema,
  choices: z
    .array(z.string().trim().min(1, "Required").max(200, "200 characters max"))
    .length(4, "Exactly 4 choices"),
  correctIndex: z.number().int().min(0).max(3),
});

const typedQuestionSchema = z.object({
  id: z.string().min(1),
  format: z.literal("typed"),
  prompt: gamePromptSchema,
  points: gamePointsSchema,
  acceptedAnswers: z
    .array(z.string().trim().min(1, "Required").max(100, "100 characters max"))
    .min(1, "At least 1 answer")
    .max(20, "20 answers max"),
});

export const gameQuestionSchema = z.discriminatedUnion("format", [
  choiceQuestionSchema,
  typedQuestionSchema,
]);

export const gameSectionSchema = z.object({
  id: z.string().min(1),
  theme: z
    .string()
    .trim()
    .min(1, "Required")
    .max(60, "60 characters max"),
  questions: z
    .array(gameQuestionSchema)
    .min(1, "At least 1 question")
    .max(50, "50 questions max"),
});

/** Create only needs a name — sections are added on the manage screen. */
export const createGameSchema = z.object({
  name: gameNameSchema,
});

export const updateGameSchema = z.object({
  name: gameNameSchema,
  sections: z.array(gameSectionSchema).max(50, "50 sections max"),
});

export const assignHostsSchema = z.object({
  hostUids: z.array(z.string().min(1)).max(100),
});

// ── Live game sessions (consume authored games) ──────────────────────────────
export const createGameSessionSchema = z.object({
  venueId: z.string().min(1, "Required"),
  gameId: z.string().min(1, "Required"),
});

/** Demo join code: TXDEMO, optionally suffixed (TXDEMO2, …). */
export const demoCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^TXDEMO\d*$/, "Invalid demo code");

export const joinGameSessionSchema = z.object({
  sessionCode: z.union([inviteCodeSchema, demoCodeSchema]),
});

// ── Admin notification settings ──────────────────────────────────────────────
const channelPrefsSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
});

/** Empty string is treated as "not set" (normalized to null in the route). */
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email");

/** E.164 US (+1 then 10 digits) or empty. */
const optionalUsPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\+1\d{10}$/.test(v), "Enter a valid US phone number");

export const adminNotificationSettingsSchema = z.object({
  email: optionalEmail,
  phone: optionalUsPhone,
  events: z.object({
    accountDeletionRequest: channelPrefsSchema,
    accountsNeedReview: channelPrefsSchema,
    gameStarted: channelPrefsSchema,
    newHostRequest: channelPrefsSchema,
    newUserSignup: channelPrefsSchema,
    newVenueAdded: channelPrefsSchema,
  }),
});

export type AdminNotificationSettingsInput = z.infer<
  typeof adminNotificationSettingsSchema
>;

const choiceAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  format: z.literal("choice"),
  choiceIndex: z.number().int().min(0).max(3),
});

const typedAnswerSchema = z.object({
  questionIndex: z.number().int().min(0),
  format: z.literal("typed"),
  typedAnswers: z
    .array(z.string().trim().max(100, "100 characters max"))
    .min(1)
    .max(20),
});

export const submitAnswerSchema = z.discriminatedUnion("format", [
  choiceAnswerSchema,
  typedAnswerSchema,
]);

/** Host confirms which submitted typed answers count as correct. */
export const gradeAnswersSchema = z.object({
  questionIndex: z.number().int().min(0),
  approved: z.array(z.string().max(100)).max(500),
});

export type SignupStep1EmailInput = z.infer<typeof signupStep1EmailSchema>;
export type SignupStep2Input = z.infer<typeof signupStep2Schema>;
export type SignupStep3Input = z.infer<typeof signupStep3Schema>;
export type CompleteSignupInput = z.infer<typeof completeSignupSchema>;
export type CheckDisplayNameInput = z.infer<typeof checkDisplayNameSchema>;
export type ProfileEditInput = z.infer<typeof profileEditSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type JoinTeamInput = z.infer<typeof joinTeamSchema>;
export type TransferCaptainInput = z.infer<typeof transferCaptainSchema>;
export type RequestActionInput = z.infer<typeof requestActionSchema>;
export type HostApplicationActionInput = z.infer<
  typeof hostApplicationActionSchema
>;
export type UserActionInput = z.infer<typeof userActionSchema>;
export type VenueAddressInput = z.infer<typeof venueAddressSchema>;
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type CreateGameSchema = z.infer<typeof createGameSchema>;
export type UpdateGameInput = z.infer<typeof updateGameSchema>;
export type CreateGameSessionInput = z.infer<typeof createGameSessionSchema>;
export type JoinGameSessionInput = z.infer<typeof joinGameSessionSchema>;
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
