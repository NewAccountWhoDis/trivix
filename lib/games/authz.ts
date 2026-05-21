import "server-only";
import { adminDb } from "@/lib/firebase/admin";

export async function isAdminUid(uid: string): Promise<boolean> {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists && Boolean(snap.data()?.isAdmin);
}

/** Owner or admin may edit/delete a game and manage its assigned hosts. */
export async function canEditGame(
  callerUid: string,
  ownerUid: string,
): Promise<boolean> {
  if (callerUid === ownerUid) return true;
  return isAdminUid(callerUid);
}

/** Owner, an assigned host, or an admin may view/Start a game. */
export async function canUseGame(
  callerUid: string,
  hostUids: string[],
): Promise<boolean> {
  if (hostUids.includes(callerUid)) return true;
  return isAdminUid(callerUid);
}

/**
 * The uids an owner may assign to their games: the owner plus the approved
 * sub-hosts on their account. Used to validate host-assignment requests.
 */
export async function assignableHostUids(ownerUid: string): Promise<string[]> {
  const snap = await adminDb.collection("users").doc(ownerUid).get();
  const data = snap.data() ?? {};
  const subs = (data.subHostUids as string[] | undefined) ?? [];
  return Array.from(new Set([ownerUid, ...subs]));
}
