// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { POST } from "@/app/api/auth/complete-signup/route";
import { adminDb } from "@/lib/firebase/admin";

const PROJECT = "trivix-dev";
const AUTH_EMU = "http://127.0.0.1:9099";
const FS_EMU = "http://127.0.0.1:8080";
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

async function clearAuthEmulator() {
  await fetch(`${AUTH_EMU}/emulator/v1/projects/${PROJECT}/accounts`, {
    method: "DELETE",
  });
}

async function clearFirestoreEmulator() {
  await fetch(
    `${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

function postBody(body: unknown): Request {
  return new Request("http://localhost/api/auth/complete-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const unique = () => `t${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

beforeEach(async () => {
  await clearFirestoreEmulator();
  await clearAuthEmulator();
});

afterEach(async () => {
  await clearFirestoreEmulator();
  await clearAuthEmulator();
});

describe("POST /api/auth/complete-signup", () => {
  it("creates users + displayNames docs for a player (happy path)", async () => {
    const { idToken, localId } = await emulatorSignUp(
      `${unique()}@example.com`,
      "password123",
    );

    const res = await POST(
      postBody({
        idToken,
        firstName: "Joe",
        lastName: "Black",
        displayName: "joe_black",
        role: "player",
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; uid: string };
    expect(body).toEqual({
      ok: true,
      uid: localId,
      displayName: "joe_black",
    });

    const userSnap = await adminDb.collection("users").doc(localId).get();
    expect(userSnap.exists).toBe(true);
    const user = userSnap.data()!;
    expect(user.role).toBe("player");
    expect(user.hostStatus).toBe("none");
    expect(user.displayNameKey).toBe("joe_black");
    expect(user.avatarSeed).toBe(localId);
    expect(user.stats.gamesPlayed).toBe(0);

    const dnSnap = await adminDb
      .collection("displayNames")
      .doc("joe_black")
      .get();
    expect(dnSnap.data()).toEqual({ uid: localId });

    const hostAppSnap = await adminDb
      .collection("hostApplications")
      .doc(localId)
      .get();
    expect(hostAppSnap.exists).toBe(false);
  });

  it("creates a hostApplication when role=host", async () => {
    const { idToken, localId } = await emulatorSignUp(
      `${unique()}@example.com`,
      "password123",
    );

    const res = await POST(
      postBody({
        idToken,
        firstName: "Joe",
        lastName: "Black",
        displayName: "host_joe",
        role: "host",
        reason: "I host weekly at Joe's Pub",
      }),
    );

    expect(res.status).toBe(200);

    const userSnap = await adminDb.collection("users").doc(localId).get();
    expect(userSnap.data()!.role).toBe("host");
    expect(userSnap.data()!.hostStatus).toBe("pending");

    const hostAppSnap = await adminDb
      .collection("hostApplications")
      .doc(localId)
      .get();
    expect(hostAppSnap.exists).toBe(true);
    const app = hostAppSnap.data()!;
    expect(app.status).toBe("pending");
    expect(app.reason).toBe("I host weekly at Joe's Pub");
  });

  it("returns 409 when displayName is already taken", async () => {
    // Pre-claim the sentinel
    await adminDb.collection("displayNames").doc("taken_name").set({
      uid: "someone-else",
    });

    const { idToken } = await emulatorSignUp(
      `${unique()}@example.com`,
      "password123",
    );

    const res = await POST(
      postBody({
        idToken,
        firstName: "Joe",
        lastName: "Black",
        displayName: "taken_name",
        role: "player",
      }),
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not available/i);
  });

  it("returns 409 when account already completed signup", async () => {
    const { idToken } = await emulatorSignUp(
      `${unique()}@example.com`,
      "password123",
    );

    const first = await POST(
      postBody({
        idToken,
        firstName: "Joe",
        lastName: "Black",
        displayName: "first_name",
        role: "player",
      }),
    );
    expect(first.status).toBe(200);

    const second = await POST(
      postBody({
        idToken,
        firstName: "Joe",
        lastName: "Black",
        displayName: "second_name",
        role: "player",
      }),
    );
    expect(second.status).toBe(409);
    const body = (await second.json()) as { error: string };
    expect(body.error).toMatch(/already/i);
  });

  it("returns 400 on invalid body (Zod failure)", async () => {
    const { idToken } = await emulatorSignUp(
      `${unique()}@example.com`,
      "password123",
    );

    const res = await POST(
      postBody({
        idToken,
        firstName: "Joe",
        lastName: "Black",
        displayName: "no spaces",
        role: "player",
      }),
    );

    expect(res.status).toBe(400);
  });

  it("returns 401 on invalid idToken", async () => {
    const res = await POST(
      postBody({
        idToken: "not-a-real-token",
        firstName: "Joe",
        lastName: "Black",
        displayName: "joe_b",
        role: "player",
      }),
    );

    expect(res.status).toBe(401);
  });

  it("returns 400 when idToken is missing", async () => {
    const res = await POST(
      postBody({
        firstName: "Joe",
        lastName: "Black",
        displayName: "joe_b",
        role: "player",
      }),
    );

    expect(res.status).toBe(400);
  });
});
