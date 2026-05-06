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

export type SignupStep1EmailInput = z.infer<typeof signupStep1EmailSchema>;
export type SignupStep2Input = z.infer<typeof signupStep2Schema>;
export type SignupStep3Input = z.infer<typeof signupStep3Schema>;
export type CompleteSignupInput = z.infer<typeof completeSignupSchema>;
export type CheckDisplayNameInput = z.infer<typeof checkDisplayNameSchema>;
export type ProfileEditInput = z.infer<typeof profileEditSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
