import "server-only";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Returns the set of uids whose resources (venues, question sets) the caller
 * can READ and USE. Includes the caller, their main host, and the main's
 * sub-hosts (siblings).
 *
 * For non-hosts this is just [uid] — non-hosts can't see resources anyway,
 * but consumers can pass the result to a `where("ownerUid", "in", uids)`
 * query without special-casing.
 *
 * Edit/delete checks should still compare strictly to ownerUid; this scope
 * widens only read/use.
 */
export async function getHostGroup(uid: string): Promise<string[]> {
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) return [uid];
  const data = userSnap.data() ?? {};
  if (data.role !== "host" || data.hostStatus !== "approved") return [uid];

  const mainHostUid = (data.mainHostUid as string | null) ?? null;
  if (mainHostUid === null) {
    // Caller is a main host — include their sub-hosts.
    const subs = (data.subHostUids as string[] | undefined) ?? [];
    return dedupe([uid, ...subs]);
  }

  // Caller is a sub-host — include main + main's other subs.
  const mainSnap = await adminDb.collection("users").doc(mainHostUid).get();
  if (!mainSnap.exists) return [uid];
  const main = mainSnap.data() ?? {};
  if (main.role !== "host" || main.hostStatus !== "approved") return [uid];
  const siblings = (main.subHostUids as string[] | undefined) ?? [];
  return dedupe([uid, mainHostUid, ...siblings]);
}

function dedupe(xs: string[]): string[] {
  return Array.from(new Set(xs));
}

/** True if `ownerUid` is the caller (owner can always edit). */
export function isOwner(callerUid: string, ownerUid: string): boolean {
  return callerUid === ownerUid;
}
