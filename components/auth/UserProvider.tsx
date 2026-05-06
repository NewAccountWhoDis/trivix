"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SerializedUser } from "@/types/firestore";

const UserContext = createContext<SerializedUser | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: SerializedUser;
  children: ReactNode;
}) {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function useUserContext(): SerializedUser {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUserContext must be used inside <UserProvider>.");
  }
  return ctx;
}

export function useOptionalUserContext(): SerializedUser | null {
  return useContext(UserContext);
}
