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
import { POST as leaveTeam } from "@/app/api/teams/[id]/leave/route";
import { POST as claimCaptain } from "@/app/api/teams/[id]/claim-captain/route";
import { POST as transferCaptain } from "@/app/api/teams/[id]/transfer-captain/route";
import { POST as regenerateCode } from "@/app/api/teams/[id]/regenerate-code/route";
import { GET as listRequests } from "@/app/api/teams/[id]/requests/route";
import { POST as actOnRequest } from "@/app/api/teams/[id]/requests/[uid]/route";
import { DELETE as disbandTeam } from "@/app/api/teams/[id]/route";
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

async function seedTeam(opts: {
  captainUid: string | null;
  memberUids: string[];
  inviteCode?: string;
}) {
  const ref = adminDb.collection("teams").doc();
  await ref.set({
    teamId: ref.id,
    name: "Quiz Crew",
    inviteCode: opts.inviteCode ?? "ABCD23",
    captainUid: opts.captainUid,
    memberUids: opts.memberUids,
    createdBy: opts.memberUids[0] ?? "alice",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  for (const uid of opts.memberUids) {
    await seedUser(uid, { teamId: ref.id });
  }
  return ref.id;
}

async function seedRequest(teamId: string, uid: string) {
  await seedUser(uid);
  await adminDb
    .collection("teams")
    .doc(teamId)
    .collection("joinRequests")
    .doc(uid)
    .set({ uid, displayName: uid, requestedAt: new Date() });
}

function asUser(uid: string, emailVerified = true) {
  vi.spyOn(session, "verifySession").mockResolvedValue({
    uid,
    email: `${uid}@x.test`,
    emailVerified,
  });
}

function postReq(body: unknown = {}): Request {
  return new Request("http://localhost/x", {
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

describe("POST /api/teams/[id]/leave", () => {
  it("captain leaves a multi-member team: captainUid set null, removed from memberUids", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("alice");

    const res = await leaveTeam(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { disbanded: boolean; captainCleared: boolean };
    expect(body.disbanded).toBe(false);
    expect(body.captainCleared).toBe(true);

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.data()!.memberUids).toEqual(["bob"]);
    expect(teamSnap.data()!.captainUid).toBeNull();

    const userSnap = await adminDb.collection("users").doc("alice").get();
    expect(userSnap.data()!.teamId).toBeNull();
  });

  it("non-captain member leaves: captainUid unchanged", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("bob");

    const res = await leaveTeam(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.data()!.memberUids).toEqual(["alice"]);
    expect(teamSnap.data()!.captainUid).toBe("alice");
  });

  it("sole member leaves disbands team", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    await seedRequest(teamId, "bob");
    asUser("alice");

    const res = await leaveTeam(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { disbanded: boolean };
    expect(body.disbanded).toBe(true);

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.exists).toBe(false);
    const reqs = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("joinRequests")
      .get();
    expect(reqs.empty).toBe(true);
    const userSnap = await adminDb.collection("users").doc("alice").get();
    expect(userSnap.data()!.teamId).toBeNull();
  });

  it("non-member returns 403", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    await seedUser("eve");
    asUser("eve");
    const res = await leaveTeam(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teams/[id]/claim-captain", () => {
  it("member claims when captainUid is null", async () => {
    const teamId = await seedTeam({
      captainUid: null,
      memberUids: ["alice", "bob"],
    });
    asUser("bob");
    const res = await claimCaptain(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);
    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.data()!.captainUid).toBe("bob");
  });

  it("returns 409 when team already has a captain", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("bob");
    const res = await claimCaptain(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(409);
  });

  it("non-member returns 403", async () => {
    const teamId = await seedTeam({
      captainUid: null,
      memberUids: ["alice"],
    });
    await seedUser("eve");
    asUser("eve");
    const res = await claimCaptain(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teams/[id]/transfer-captain", () => {
  it("captain transfers to another member", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("alice");
    const res = await transferCaptain(postReq({ uid: "bob" }), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);
    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.data()!.captainUid).toBe("bob");
  });

  it("rejects when target is not a member", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    asUser("alice");
    const res = await transferCaptain(postReq({ uid: "bob" }), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(400);
  });

  it("non-captain caller returns 403", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("bob");
    const res = await transferCaptain(postReq({ uid: "alice" }), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teams/[id]/regenerate-code", () => {
  it("captain regenerates the invite code", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
      inviteCode: "OLDOLD",
    });
    asUser("alice");
    const res = await regenerateCode(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { inviteCode: string };
    expect(body.inviteCode).not.toBe("OLDOLD");
    expect(body.inviteCode).toMatch(/^[A-HJ-KM-NP-Z2-9]{6}$/);

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.data()!.inviteCode).toBe(body.inviteCode);
  });

  it("non-captain returns 403", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("bob");
    const res = await regenerateCode(postReq(), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/teams/[id]/requests", () => {
  it("captain lists pending requests in order", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    await seedRequest(teamId, "bob");
    await seedRequest(teamId, "carol");
    asUser("alice");

    const res = await listRequests(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      requests: { uid: string; displayName: string }[];
    };
    expect(body.requests.map((r) => r.uid).sort()).toEqual(["bob", "carol"]);
  });

  it("non-captain returns 403", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("bob");
    const res = await listRequests(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/teams/[id]/requests/[uid]", () => {
  it("approve adds member, sets target.teamId, deletes request", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    await seedRequest(teamId, "bob");
    asUser("alice");

    const res = await actOnRequest(postReq({ action: "approve" }), {
      params: Promise.resolve({ id: teamId, uid: "bob" }),
    });
    expect(res.status).toBe(200);

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.data()!.memberUids).toContain("bob");

    const userSnap = await adminDb.collection("users").doc("bob").get();
    expect(userSnap.data()!.teamId).toBe(teamId);
    expect(userSnap.data()!.teamHistory).toContain(teamId);

    const reqSnap = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("joinRequests")
      .doc("bob")
      .get();
    expect(reqSnap.exists).toBe(false);
  });

  it("approve fails 409 if target is now on a team", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    await seedUser("bob", { teamId: "other" });
    await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("joinRequests")
      .doc("bob")
      .set({ uid: "bob", displayName: "bob", requestedAt: new Date() });
    asUser("alice");

    const res = await actOnRequest(postReq({ action: "approve" }), {
      params: Promise.resolve({ id: teamId, uid: "bob" }),
    });
    expect(res.status).toBe(409);
  });

  it("deny just deletes the request", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    await seedRequest(teamId, "bob");
    asUser("alice");

    const res = await actOnRequest(postReq({ action: "deny" }), {
      params: Promise.resolve({ id: teamId, uid: "bob" }),
    });
    expect(res.status).toBe(200);

    const reqSnap = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("joinRequests")
      .doc("bob")
      .get();
    expect(reqSnap.exists).toBe(false);

    const userSnap = await adminDb.collection("users").doc("bob").get();
    expect(userSnap.data()!.teamId).toBeNull();
  });

  it("non-captain returns 403", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    await seedRequest(teamId, "carol");
    asUser("bob");
    const res = await actOnRequest(postReq({ action: "approve" }), {
      params: Promise.resolve({ id: teamId, uid: "carol" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 if request doesn't exist", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice"],
    });
    await seedUser("bob");
    asUser("alice");
    const res = await actOnRequest(postReq({ action: "deny" }), {
      params: Promise.resolve({ id: teamId, uid: "bob" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/teams/[id]", () => {
  it("captain disbands: clears all members.teamId, deletes requests, deletes team", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob", "carol"],
    });
    await seedRequest(teamId, "dave");
    asUser("alice");

    const res = await disbandTeam(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(200);

    const teamSnap = await adminDb.collection("teams").doc(teamId).get();
    expect(teamSnap.exists).toBe(false);

    for (const uid of ["alice", "bob", "carol"]) {
      const u = await adminDb.collection("users").doc(uid).get();
      expect(u.data()!.teamId).toBeNull();
    }

    const reqs = await adminDb
      .collection("teams")
      .doc(teamId)
      .collection("joinRequests")
      .get();
    expect(reqs.empty).toBe(true);
  });

  it("non-captain returns 403", async () => {
    const teamId = await seedTeam({
      captainUid: "alice",
      memberUids: ["alice", "bob"],
    });
    asUser("bob");
    const res = await disbandTeam(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: teamId }),
    });
    expect(res.status).toBe(403);
  });
});
