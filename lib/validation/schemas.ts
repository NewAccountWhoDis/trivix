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
});

export const signupStep3Schema = z.object({
  role: z.enum(["player", "host"]),
  reason: z.string().trim().max(500).optional().nullable(),
});

export const completeSignupSchema = signupStep2Schema.merge(signupStep3Schema);

export const checkDisplayNameSchema = z.object({
  displayName: displayNameSchema,
});

export const profileEditSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  displayName: displayNameSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
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
export const hostApplicationActionSchema = z.object({
  action: z.enum(["approve", "deny"]),
});

export const userActionSchema = z.object({
  action: z.enum(["revoke-host", "delete"]),
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
