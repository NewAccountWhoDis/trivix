// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  initializeApp as initAdminApp,
  deleteApp as deleteAdminApp,
  type App,
} from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";

let adminApp: App;

const PROJECT = "trivix-dev";
const AUTH_EMU = "http://127.0.0.1:9099";
const SIGNUP_URL = `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`;

async function emulatorSignUp(
  email: string,
  password: string,
): Promise<{ idToken: string; localId: string }> {
  const res = await fetch(SIGNUP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`signup failed: ${res.status}`);
  return (await res.json()) as { idToken: string; localId: string };
}

beforeAll(() => {
  adminApp = initAdminApp({ projectId: PROJECT }, "session-test");
});

afterAll(async () => {
  await deleteAdminApp(adminApp);
});

describe("session cookies (emulator)", () => {
  it("mints and verifies a session cookie round-trip", async () => {
    const email = `s${Date.now()}@example.com`;
    const { idToken, localId } = await emulatorSignUp(email, "password123");

    const auth = getAdminAuth(adminApp);
    const cookie = await auth.createSessionCookie(idToken, {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });

    expect(typeof cookie).toBe("string");
    expect(cookie.length).toBeGreaterThan(20);

    const decoded = await auth.verifySessionCookie(cookie, true);
    expect(decoded.uid).toBe(localId);
    expect(decoded.email).toBe(email);
    expect(decoded.email_verified).toBe(false);
  });

  it("rejects an invalid session cookie", async () => {
    const auth = getAdminAuth(adminApp);
    await expect(
      auth.verifySessionCookie("not-a-real-cookie", true),
    ).rejects.toThrow();
  });
});
