"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";

export interface AuthState {
  user: User | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: firebaseAuth.currentUser,
    loading: firebaseAuth.currentUser === null,
  });

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (user) => {
      setState({ user, loading: false });
    });
  }, []);

  return state;
}
