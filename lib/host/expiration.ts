import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

function tsToMs(value: unknown): number | null {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return null;
}

/**
 * If the user is a main host whose hostExpiresAt has passed, transactionally
 * downgrade the main and every listed sub-host. If the user is a sub-host,
 * downgrade them when their main is expired.
 *
 * Safe to call on any uid; no-op when nothing needs to change.
 */
export async function checkAndExpireHost(uid: string): Promise<void> {
  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return;
  const data = snap.data() ?? {};
  if (data.role !== "host") return;
  if (data.hostStatus !== "approved") return;

  const mainHostUid = (data.mainHostUid as string | null) ?? null;
  const now = Date.now();

  if (!mainHostUid) {
    // Main host — check own expiration.
    const expires = tsToMs(data.hostExpiresAt);
    if (expires === null) return; // no expiration set; never expires
    if (expires > now) return;
    await downgradeMainAndSubs(uid);
    return;
  }

  // Sub-host — check parent expiration.
  const mainSnap = await adminDb.collection("users").doc(mainHostUid).get();
  if (!mainSnap.exists) {
    // Orphan sub-host; treat as expired.
    await downgradeSelf(uid);
    return;
  }
  const main = mainSnap.data() ?? {};
  if (main.hostStatus !== "approved") {
    await downgradeSelf(uid);
    return;
  }
  const expires = tsToMs(main.hostExpiresAt);
  if (expires === null || expires > now) return;
  await downgradeMainAndSubs(mainHostUid);
}

async function downgradeMainAndSubs(mainUid: string): Promise<void> {
  const mainRef = adminDb.collection("users").doc(mainUid);
  await adminDb.runTransaction(async (tx) => {
    const mainSnap = await tx.get(mainRef);
    if (!mainSnap.exists) return;
    const data = mainSnap.data() ?? {};
    if (data.hostStatus !== "approved") return;
    const subs = (data.subHostUids as string[] | undefined) ?? [];
    const subRefs = subs.map((s) => adminDb.collection("users").doc(s));
    // Read all sub docs inside the transaction to satisfy Firestore ordering rules.
    await Promise.all(subRefs.map((r) => tx.get(r)));

    const now = FieldValue.serverTimestamp();
    tx.update(mainRef, {
      hostStatus: "denied",
      subHostUids: [],
      updatedAt: now,
    });
    for (const r of subRefs) {
      tx.update(r, {
        hostStatus: "denied",
        mainHostUid: null,
        updatedAt: now,
      });
    }
  });
}

async function downgradeSelf(uid: string): Promise<void> {
  await adminDb.collection("users").doc(uid).update({
    hostStatus: "denied",
    mainHostUid: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
