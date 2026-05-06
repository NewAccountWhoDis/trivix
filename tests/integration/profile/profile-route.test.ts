// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/profile/[displayName]/route";
import { PATCH } from "@/app/api/profile/route";
import { adminDb } from "@/lib/firebase/admin";
import { DEFAULT_USER_STATS } from "@/types/firestore";
import * as session from "@/lib/firebase/session";

const FS_EMU = "http://127.0.0.1:8080";
const PROJECT = "trivix-dev";

async function clearFirestore() {
  await fetch(
    `${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

async function seedUser(
  uid: string,
  displayName: string,
  extra: Record<string, unknown> = {},
) {
  const key = displayName.toLowerCase();
  await adminDb
    .collection("users")
    .doc(uid)
    .set({
      uid,
      email: `${uid}@x.test`,
      emailVerified: true,
      firstName: "First",
      lastName: "Last",
      displayName,
      displayNameKey: key,
      avatarSeed: uid,
      role: "player",
      hostStatus: "none",
      isAdmin: false,
      teamId: null,
      teamHistory: [],
      stats: DEFAULT_USER_STATS,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...extra,
    });
  await adminDb.collection("displayNames").doc(key).set({ uid });
}

beforeEach(clearFirestore);
afterEach(() => {
  vi.restoreAllMocks();
  return clearFirestore();
});

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq(): Request {
  return new Request("http://localhost/api/profile/x");
}

describe("PATCH /api/profile", () => {
  it("returns 401 without a session", async () => {
    vi.spyOn(session, "verifySession").mockResolvedValueOnce(null);
    const res = await PATCH(
      patchReq({ firstName: "X", lastName: "Y", displayName: "newname" }),
    );
    expect(res.status).toBe(401);
  });

  it("updates names without renaming displayName", async () => {
    await seedUser("u1", "alice");
    vi.spyOn(session, "verifySession").mockResolvedValue({
      uid: "u1",
      email: "u1@x.test",
      emailVerified: true,
    });

    const res = await PATCH(
      patchReq({
        firstName: "Alice",
        lastName: "Wonder",
        displayName: "alice",
      }),
    );
    expect(res.status).toBe(200);

    const userSnap = await adminDb.collection("users").doc("u1").get();
    expect(userSnap.data()!.firstName).toBe("Alice");
    expect(userSnap.data()!.lastName).toBe("Wonder");
    expect(userSnap.data()!.displayNameKey).toBe("alice");
  });

  it("renames displayName atomically (deletes old sentinel, creates new)", async () => {
    await seedUser("u1", "alice");
    vi.spyOn(session, "verifySession").mockResolvedValue({
      uid: "u1",
      email: "u1@x.test",
      emailVerified: true,
    });

    const res = await PATCH(
      patchReq({
        firstName: "First",
        lastName: "Last",
        displayName: "alice2",
      }),
    );
    expect(res.status).toBe(200);

    const oldDn = await adminDb.collection("displayNames").doc("alice").get();
    const newDn = await adminDb.collection("displayNames").doc("alice2").get();
    expect(oldDn.exists).toBe(false);
    expect(newDn.data()).toEqual({ uid: "u1" });
  });

  it("returns 409 when target displayName is already taken", async () => {
    await seedUser("u1", "alice");
    await seedUser("u2", "bob");
    vi.spyOn(session, "verifySession").mockResolvedValue({
      uid: "u1",
      email: "u1@x.test",
      emailVerified: true,
    });

    const res = await PATCH(
      patchReq({ firstName: "F", lastName: "L", displayName: "bob" }),
    );
    expect(res.status).toBe(409);

    // Original sentinel intact
    const oldDn = await adminDb.collection("displayNames").doc("alice").get();
    expect(oldDn.data()).toEqual({ uid: "u1" });
  });

  it("returns 400 on invalid body", async () => {
    vi.spyOn(session, "verifySession").mockResolvedValue({
      uid: "u1",
      email: "u1@x.test",
      emailVerified: true,
    });
    const res = await PATCH(
      patchReq({ firstName: "F", lastName: "L", displayName: "bad name!" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/profile/[displayName]", () => {
  it("returns 401 without a session", async () => {
    vi.spyOn(session, "verifySession").mockResolvedValueOnce(null);
    const res = await GET(getReq(), {
      params: Promise.resolve({ displayName: "alice" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns public-fields-only payload for an existing user", async () => {
    await seedUser("u1", "alice", {
      stats: { ...DEFAULT_USER_STATS, gamesPlayed: 7, highestScore: 12 },
    });
    vi.spyOn(session, "verifySession").mockResolvedValue({
      uid: "u-viewer",
      email: "v@x.test",
      emailVerified: true,
    });

    const res = await GET(getReq(), {
      params: Promise.resolve({ displayName: "Alice" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.displayName).toBe("alice");
    expect(body.stats).toEqual({
      gamesPlayed: 7,
      gamesWon: 0,
      longestWinStreak: 0,
      highestScore: 12,
    });
    // private fields must not be present
    expect(body.email).toBeUndefined();
    expect(body.firstName).toBeUndefined();
    expect(body.teamHistory).toBeUndefined();
  });

  it("returns 404 for an unknown displayName", async () => {
    vi.spyOn(session, "verifySession").mockResolvedValue({
      uid: "u-viewer",
      email: "v@x.test",
      emailVerified: true,
    });
    const res = await GET(getReq(), {
      params: Promise.resolve({ displayName: "ghost" }),
    });
    expect(res.status).toBe(404);
  });
});
