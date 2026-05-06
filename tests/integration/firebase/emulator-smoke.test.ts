// tests/integration/firebase/emulator-smoke.test.ts
// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { describe, it, expect, beforeAll } from "vitest";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app: ReturnType<typeof initializeApp>;

beforeAll(() => {
  app = initializeApp({ projectId: "trivix-dev" }, "smoke");
});

describe("firebase emulator", () => {
  it("round-trips a write and read", { timeout: 15000 }, async () => {
    const db = getFirestore(app);
    const ref = db.collection("_smoke").doc("hello");
    await ref.set({ ok: true });
    const snap = await ref.get();
    expect(snap.data()).toEqual({ ok: true });
    await ref.delete();
    await deleteApp(app);
  });
});
