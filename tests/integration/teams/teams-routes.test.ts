// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST as createTeam } from "@/app/api/teams/route";
import { POST as joinTeam } from "@/app/api/teams/join/route";
import { GET as getTeam } from "@/app/api/teams/[id]/route";
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

async function seedUser(uid: string, opts: Record<string, unknown> = {}) {
  await adminDb
    .collection("users")
    .doc(uid)
    .set({
      uid,
      email: `${uid}@x.test`,
      emailVerified: true,
      firstName: "F",
      lastName: "L",
      displayName: uid,
      displayNameKey: uid,
      avatarSeed: uid,
      role: "player",
      hostStatus: "none",
      isAdmin: false,
      teamId: null,
      teamHistory: [],
      stats: DEFAULT_USER_STATS,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...opts,
    });
  await adminDb.collection("displayNames").doc(uid).set({ uid });
}

function asUser(uid: string, emailVerified = true) {
  vi.spyOn(session, "verifySession").mockResolvedValue({
    uid,
    email: `${uid}@x.test`,
    emailVerified,
  });
}

function postReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(clearFirestore);
afterEach(() => {
  vi.restoreAllMocks();
  return clearFirestore();
});

describe("POST /api/teams (create)", () => {
  it("creates a team and updates user.teamId atomically", async () => {
    await seedUser("alice");
    asUser("alice");

    const res = await createTeam(
      postReq("http://localhost/api/teams", { name: "Quiz Crew" }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { teamId: string; inviteCode: string };
    expect(body.teamId).toBeTruthy();
    expect(body.inviteCode).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);

    const teamSnap = await adminDb.collection("teams").doc(body.teamId).get();
    expect(teamSnap.data()!.captainUid).toBe("alice");
    expect(teamSnap.data()!.memberUids).toEqual(["alice"]);

    const userSnap = await adminDb.collection("users").doc("alice").get();
    expect(userSnap.data()!.teamId).toBe(body.teamId);
    expect(userSnap.data()!.teamHistory).toContain(body.teamId);
  });

  it("rejects unauthenticated callers", async () => {
    vi.spyOn(session, "verifySession").mockResolvedValueOnce(null);
    const res = await createTeam(
      postReq("http://localhost/api/teams", { name: "X" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects users with unverified email", async () => {
    await seedUser("alice");
    asUser("alice", false);
    const res = await createTeam(
      postReq("http://localhost/api/teams", { name: "X" }),
    );
    expect(res.status).toBe(403);
  });

  it("rejects 409 when user is already on a team", async () => {
    await seedUser("alice", { teamId: "existing-team" });
    asUser("alice");
    const res = await createTeam(
      postReq("http://localhost/api/teams", { name: "Quiz Crew" }),
    );
    expect(res.status).toBe(409);
  });

  it("rejects 400 on invalid name", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await createTeam(
      postReq("http://localhost/api/teams", { name: "X" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("POST /api/teams/join", () => {
  async function seedTeam(captainUid = "alice", code = "ABCD23") {
    const teamRef = adminDb.collection("teams").doc();
    await teamRef.set({
      teamId: teamRef.id,
      name: "Quiz Crew",
      inviteCode: code,
      captainUid,
      memberUids: [captainUid],
      createdBy: captainUid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { teamId: teamRef.id, inviteCode: code };
  }

  it("creates a joinRequest doc and returns 200", async () => {
    const { teamId, inviteCode } = await seedTeam();
    await seedUser("alice", { teamId, displayName: "alice" });
    await seedUser("bob");
    asUser("bob");

    const res = await joinTeam(
      postReq("http://localhost/api/teams/join", { inviteCode }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { teamId: string };
    expect(body.teamId).toBe(teamId);

    const reqSnap = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("joinRequests")
      .doc("bob")
      .get();
    expect(reqSnap.exists).toBe(true);
    expect(reqSnap.data()!.uid).toBe("bob");
  });

  it("returns 404 for unknown invite code", async () => {
    await seedUser("bob");
    asUser("bob");
    const res = await joinTeam(
      postReq("http://localhost/api/teams/join", { inviteCode: "ZZZZ99" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 409 when caller is already a member", async () => {
    const { teamId, inviteCode } = await seedTeam();
    await seedUser("alice", { teamId });
    asUser("alice");
    const res = await joinTeam(
      postReq("http://localhost/api/teams/join", { inviteCode }),
    );
    expect(res.status).toBe(409);
  });

  it("returns 409 when caller is already on a different team", async () => {
    const { inviteCode } = await seedTeam();
    await seedUser("bob", { teamId: "other-team" });
    asUser("bob");
    const res = await joinTeam(
      postReq("http://localhost/api/teams/join", { inviteCode }),
    );
    expect(res.status).toBe(409);
  });

  it("idempotent on repeat: returns alreadyRequested true", async () => {
    const { teamId, inviteCode } = await seedTeam();
    await seedUser("bob");
    asUser("bob");

    const a = await joinTeam(
      postReq("http://localhost/api/teams/join", { inviteCode }),
    );
    expect(a.status).toBe(200);

    const b = await joinTeam(
      postReq("http://localhost/api/teams/join", { inviteCode }),
    );
    expect(b.status).toBe(200);
    const body = (await b.json()) as { alreadyRequested?: boolean };
    expect(body.alreadyRequested).toBe(true);

    // ensure only one request doc
    const reqs = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("joinRequests")
      .get();
    expect(reqs.size).toBe(1);
  });

  it("rejects 400 on bad invite code format", async () => {
    await seedUser("bob");
    asUser("bob");
    const res = await joinTeam(
      postReq("http://localhost/api/teams/join", { inviteCode: "bad code" }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/teams/[id]", () => {
  async function seedTeamWithMembers(memberUids: string[], captainUid: string) {
    const teamRef = adminDb.collection("teams").doc();
    await teamRef.set({
      teamId: teamRef.id,
      name: "Quiz Crew",
      inviteCode: "ABCD23",
      captainUid,
      memberUids,
      createdBy: captainUid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    for (const uid of memberUids) {
      await seedUser(uid, { teamId: teamRef.id });
    }
    return teamRef.id;
  }

  it("returns serialized team with member summaries for a member", async () => {
    const teamId = await seedTeamWithMembers(["alice", "bob"], "alice");
    asUser("alice");

    const res = await getTeam(new Request(`http://localhost/api/teams/${teamId}`), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.name).toBe("Quiz Crew");
    expect(body.inviteCode).toBe("ABCD23");
    expect(body.captainUid).toBe("alice");
    expect(body.memberUids).toEqual(["alice", "bob"]);
    const members = body.members as Array<Record<string, unknown>>;
    expect(members).toHaveLength(2);
    expect(members.find((m) => m.uid === "alice")!.isCaptain).toBe(true);
    expect(members.find((m) => m.uid === "bob")!.isCaptain).toBe(false);
  });

  it("returns 403 for non-members", async () => {
    const teamId = await seedTeamWithMembers(["alice"], "alice");
    await seedUser("eve");
    asUser("eve");

    const res = await getTeam(new Request(`http://localhost/api/teams/${teamId}`), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown team", async () => {
    asUser("alice");
    const res = await getTeam(new Request("http://localhost/api/teams/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 401 without a session", async () => {
    vi.spyOn(session, "verifySession").mockResolvedValueOnce(null);
    const res = await getTeam(new Request("http://localhost/api/teams/x"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(res.status).toBe(401);
  });
});
