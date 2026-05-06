// lib/firebase/session.ts
import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./admin";

const COOKIE_NAME = "__session";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
}

export async function setSessionCookie(idToken: string): Promise<void> {
  const cookie = await createSessionCookie(idToken);
  (await cookies()).set(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FIVE_DAYS_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSessionUid(): Promise<string | null> {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

export interface VerifiedSession {
  uid: string;
  email: string | null;
  emailVerified: boolean;
}

export async function verifySession(): Promise<VerifiedSession | null> {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: Boolean(decoded.email_verified),
    };
  } catch {
    return null;
  }
}
