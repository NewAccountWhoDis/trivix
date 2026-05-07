import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export type HostOutcome =
  | { ok: true; uid: string }
  | { ok: false; status: number; error: string };

/**
 * Verifies the caller is a verified, approved host.
 */
export async function requireApprovedHost(): Promise<HostOutcome> {
  const session = await verifySession();
  if (!session) return { ok: false, status: 401, error: "Not signed in" };
  if (!session.emailVerified) {
    return { ok: false, status: 403, error: "Verify your email first" };
  }
  const userSnap = await adminDb.collection("users").doc(session.uid).get();
  if (!userSnap.exists) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  const data = userSnap.data() ?? {};
  if (data.role !== "host" || data.hostStatus !== "approved") {
    return { ok: false, status: 403, error: "Approved hosts only" };
  }
  return { ok: true, uid: session.uid };
}
