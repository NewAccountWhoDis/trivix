// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { SEED_USERS, clearSeed, seedEmulator } from "@/tests/fixtures/seed";

const FS_EMU = "http://127.0.0.1:8080";
const AUTH_EMU = "http://127.0.0.1:9099";
const PROJECT = "trivix-dev";

async function clearAll() {
  await fetch(
    `${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" },
  );
  await fetch(`${AUTH_EMU}/emulator/v1/projects/${PROJECT}/accounts`, {
    method: "DELETE",
  });
}

beforeAll(clearAll);
afterAll(clearAll);

describe("seedEmulator", () => {
  it("creates auth + firestore docs for each seed user", async () => {
    await seedEmulator();

    for (const u of SEED_USERS) {
      const authRecord = await adminAuth.getUser(u.uid);
      expect(authRecord.email).toBe(u.email);
      expect(authRecord.emailVerified).toBe(u.emailVerified);

      const userSnap = await adminDb.collection("users").doc(u.uid).get();
      expect(userSnap.exists).toBe(true);
      const data = userSnap.data()!;
      expect(data.role).toBe(u.role);
      expect(data.hostStatus).toBe(u.hostStatus);
      expect(data.isAdmin).toBe(u.isAdmin);

      const dnSnap = await adminDb
        .collection("displayNames")
        .doc(u.displayName.toLowerCase())
        .get();
      expect(dnSnap.data()).toEqual({ uid: u.uid });

      if (u.role === "host") {
        const appSnap = await adminDb
          .collection("hostApplications")
          .doc(u.uid)
          .get();
        expect(appSnap.exists).toBe(true);
      }
    }
  });

  it("clearSeed removes everything it created", async () => {
    await seedEmulator();
    await clearSeed();
    for (const u of SEED_USERS) {
      const userSnap = await adminDb.collection("users").doc(u.uid).get();
      expect(userSnap.exists).toBe(false);
    }
  });
});
