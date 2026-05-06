import "@/tests/setup/emulator-bootstrap";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { GoogleAuthProvider } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { signOutClient, signUpWithEmail } from "@/lib/auth/client";
import { linkPendingGoogleCredential } from "@/lib/auth/provider-linking";

const EMU = "http://127.0.0.1:9099";
const PROJECT = "trivix-dev";

async function clearAuthEmulator() {
  await fetch(`${EMU}/emulator/v1/projects/${PROJECT}/accounts`, {
    method: "DELETE",
  });
}

function b64url(obj: object): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Fake unsigned Google ID token accepted by the Firebase Auth emulator. */
function fakeGoogleIdToken(
  email: string,
  sub = `google-${Date.now()}`,
): string {
  const header = b64url({ alg: "none", typ: "JWT" });
  const payload = b64url({
    sub,
    email,
    email_verified: true,
    name: "Test User",
    aud: PROJECT,
    iss: "https://accounts.google.com",
  });
  return `${header}.${payload}.`;
}

const unique = () => `t${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeAll(async () => {
  await clearAuthEmulator();
});

beforeEach(async () => {
  await signOutClient().catch(() => {});
});

afterEach(async () => {
  await signOutClient().catch(() => {});
  await clearAuthEmulator();
});

describe("linkPendingGoogleCredential (emulator)", () => {
  it("links a Google credential to an existing email/password account", async () => {
    const email = `${unique()}@example.com`;
    const password = "password123";

    await signUpWithEmail({ email, password });
    await signOutClient();

    const pendingCred = GoogleAuthProvider.credential(fakeGoogleIdToken(email));

    const linked = await linkPendingGoogleCredential({
      email,
      password,
      pendingCred,
    });

    const providerIds = linked.user.providerData.map((p) => p.providerId);
    expect(providerIds).toContain("password");
    expect(providerIds).toContain("google.com");
    expect(linked.user.email).toBe(email);
    expect(firebaseAuth.currentUser?.uid).toBe(linked.user.uid);
  });

  it("fails on wrong password before any link occurs", async () => {
    const email = `${unique()}@example.com`;
    await signUpWithEmail({ email, password: "password123" });
    await signOutClient();

    const pendingCred = GoogleAuthProvider.credential(fakeGoogleIdToken(email));

    await expect(
      linkPendingGoogleCredential({
        email,
        password: "wrong-password",
        pendingCred,
      }),
    ).rejects.toThrow();

    expect(firebaseAuth.currentUser).toBeNull();
  });
});
