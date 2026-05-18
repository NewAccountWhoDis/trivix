import "@/tests/setup/emulator-bootstrap";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { firebaseAuth } from "@/lib/firebase/client";
import {
  getIdToken,
  signInWithEmail,
  signOutClient,
  signUpWithEmail,
} from "@/lib/auth/client";

const EMU = "http://127.0.0.1:9099";
const PROJECT = "trivix-dev";

async function clearAuthEmulator() {
  await fetch(`${EMU}/emulator/v1/projects/${PROJECT}/accounts`, {
    method: "DELETE",
  });
}

const unique = () => `t${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeAll(async () => {
  await clearAuthEmulator();
});

afterEach(async () => {
  await signOutClient().catch(() => {});
  await clearAuthEmulator();
});

afterAll(async () => {
  await signOutClient().catch(() => {});
});

describe("lib/auth/client (emulator)", () => {
  it("signUpWithEmail creates a new user", async () => {
    const email = `${unique()}@example.com`;
    const cred = await signUpWithEmail({ email, password: "password123" });
    expect(cred.user.email).toBe(email);
    expect(firebaseAuth.currentUser?.uid).toBe(cred.user.uid);
  });

  it("signInWithEmail signs in an existing user", async () => {
    const email = `${unique()}@example.com`;
    await signUpWithEmail({ email, password: "password123" });
    await signOutClient();
    const cred = await signInWithEmail({ email, password: "password123" });
    expect(cred.user.email).toBe(email);
  });

  it("signOutClient clears currentUser", async () => {
    await signUpWithEmail({
      email: `${unique()}@example.com`,
      password: "password123",
    });
    await signOutClient();
    expect(firebaseAuth.currentUser).toBeNull();
  });

  it("getIdToken returns a token for the signed-in user", async () => {
    await signUpWithEmail({
      email: `${unique()}@example.com`,
      password: "password123",
    });
    const token = await getIdToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("getIdToken throws when no user", async () => {
    await signOutClient();
    await expect(getIdToken()).rejects.toThrow(/No authenticated user/);
  });
});
