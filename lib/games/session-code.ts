import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { generateUniqueInviteCode } from "@/lib/teams/invite-code";

/**
 * Generates a 6-char session code that doesn't collide with an existing
 * `gameSessions` doc. Reuses the unambiguous-alphabet generator from teams.
 *
 * NB: this only checks active codes — if you want collisions to be impossible
 * even with ended sessions present, the namespace (31^6 ≈ 887M) is plenty.
 */
export async function generateUniqueSessionCode(): Promise<string> {
  return generateUniqueInviteCode(async (code) => {
    const snap = await adminDb
      .collection("gameSessions")
      .where("sessionCode", "==", code)
      .limit(1)
      .get();
    return !snap.empty;
  });
}
