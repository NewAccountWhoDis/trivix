import "server-only";
import {
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

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
