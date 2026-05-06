"use client";

import {
  useOptionalUserContext,
  useUserContext,
} from "@/components/auth/UserProvider";
import type { SerializedUser } from "@/types/firestore";

/** Returns the active user. Throws if used outside <UserProvider>. */
export function useUser(): SerializedUser {
  return useUserContext();
}

/** Same, but returns null instead of throwing when no provider is present. */
export function useOptionalUser(): SerializedUser | null {
  return useOptionalUserContext();
}
