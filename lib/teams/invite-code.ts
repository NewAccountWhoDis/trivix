import { randomInt } from "node:crypto";
import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
} from "@/lib/validation/schemas";

export type RandomIntFn = (max: number) => number;

const defaultRandomInt: RandomIntFn = (max) => randomInt(max);

/**
 * Generate a 6-char invite code from the unambiguous alphabet.
 * Optional `rand` lets tests inject a deterministic RNG.
 */
export function generateInviteCode(
  rand: RandomIntFn = defaultRandomInt,
): string {
  const chars: string[] = [];
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    chars.push(INVITE_CODE_ALPHABET[rand(INVITE_CODE_ALPHABET.length)]!);
  }
  return chars.join("");
}

/**
 * Generate a code that doesn't collide with an existing set.
 * Bails out after `maxAttempts` to avoid infinite loops on a saturated namespace.
 */
export async function generateUniqueInviteCode(
  isTaken: (code: string) => Promise<boolean>,
  options: { maxAttempts?: number; rand?: RandomIntFn } = {},
): Promise<string> {
  const maxAttempts = options.maxAttempts ?? 10;
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateInviteCode(options.rand);
    if (!(await isTaken(code))) return code;
  }
  throw new Error(
    `Failed to generate a unique invite code after ${maxAttempts} attempts.`,
  );
}
