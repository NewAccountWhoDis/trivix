import "server-only";
import {
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export type Outcome<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };

export async function requireVerifiedSession(): Promise<
  Outcome<{ uid: string; email: string | null; emailVerified: boolean }>
> {
  const session = await verifySession();
  if (!session) return { ok: false, status: 401, error: "Not signed in" };
  if (!session.emailVerified)
    return { ok: false, status: 403, error: "Verify your email first" };
  return { ok: true, value: session };
}

export async function loadTeam(teamId: string): Promise<{
  ref: DocumentReference;
  snap: DocumentSnapshot;
}> {
  const ref = adminDb.collection("teams").doc(teamId);
  const snap = await ref.get();
  return { ref, snap };
}

export function isCaptain(snap: DocumentSnapshot, uid: string): boolean {
  return snap.exists && (snap.data()?.captainUid as string | null) === uid;
}

export function isMember(snap: DocumentSnapshot, uid: string): boolean {
  return (
    snap.exists &&
    ((snap.data()?.memberUids as string[] | undefined) ?? []).includes(uid)
  );
}
