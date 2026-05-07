"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, type DocumentData } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";

export interface RealtimeSessionView {
  loading: boolean;
  error: string | null;
  session: DocumentData | null;
  /** Only populated for the host; players get permission-denied. */
  answerKey: DocumentData | null;
}

/**
 * Subscribes to gameSessions/{sessionId} via onSnapshot. If the caller is
 * the host, also subscribes to gameSessionKeys/{sessionId} so the host UI
 * can preview answers. Cleans up listeners on unmount.
 */
export function useGameSession(
  sessionId: string,
  myUid: string,
): RealtimeSessionView {
  const [session, setSession] = useState<DocumentData | null>(null);
  const [answerKey, setAnswerKey] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(firebaseDb, "gameSessions", sessionId),
      (snap) => {
        setSession(snap.exists() ? snap.data() : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [sessionId]);

  // Conditionally subscribe to keys only when we know we're the host.
  useEffect(() => {
    if (!session || session.hostUid !== myUid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnswerKey(null);
      return;
    }
    const unsub = onSnapshot(
      doc(firebaseDb, "gameSessionKeys", sessionId),
      (snap) => {
        setAnswerKey(snap.exists() ? snap.data() : null);
      },
      () => {
        // Permission-denied or transient — leave key state untouched.
      },
    );
    return () => unsub();
  }, [sessionId, session, myUid]);

  return { session, answerKey, loading, error };
}
