import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export type AdminOutcome =
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string };

/**
 * Verifies the caller has a valid session and `users/{uid}.isAdmin === true`.
 */
export async function requireAdmin(): Promise<AdminOutcome> {
  const session = await verifySession();
  if (!session) return { ok: false, status: 401, error: "Not signed in" };
  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  if (!userSnap.exists) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  if (!userSnap.data()?.isAdmin) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, uid: session.uid };
}
