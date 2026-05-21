import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

const SESSION_TTL_MS = 5 * 24 * 60 * 60 * 1000; // matches the session cookie

/** Best-effort client IP, preferring Netlify's header, then x-forwarded-for. */
export function getClientIp(request: Request): string {
  const nf = request.headers.get("x-nf-client-connection-ip");
  if (nf) return nf.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "unknown";
}

/**
 * Record a login as a session document. Best-effort: callers should not let a
 * failure here block authentication. Returns the new session id, or null.
 */
export async function recordLogin(opts: {
  uid: string;
  ip: string;
  userAgent: string;
}): Promise<string | null> {
  try {
    const ref = adminDb.collection("userSessions").doc();
    await ref.set({
      sessionId: ref.id,
      uid: opts.uid,
      ip: opts.ip,
      userAgent: opts.userAgent.slice(0, 500),
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + SESSION_TTL_MS),
      endedAt: null,
    });
    return ref.id;
  } catch (err) {
    console.error("[sessions] recordLogin failed", err);
    return null;
  }
}

/** Mark all of a user's not-yet-ended sessions as ended (sign out everywhere). */
export async function endUserSessions(uid: string): Promise<void> {
  const snap = await adminDb
    .collection("userSessions")
    .where("uid", "==", uid)
    .get();
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  let pending = 0;
  for (const doc of snap.docs) {
    if (doc.data().endedAt) continue;
    batch.update(doc.ref, { endedAt: now });
    pending += 1;
  }
  if (pending > 0) await batch.commit();
}
