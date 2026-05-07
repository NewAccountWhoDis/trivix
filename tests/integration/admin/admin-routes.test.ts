// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as listApps } from "@/app/api/admin/host-applications/route";
import { POST as actOnApp } from "@/app/api/admin/host-applications/[uid]/route";
import { GET as listUsers } from "@/app/api/admin/users/route";
import { POST as actOnUser } from "@/app/api/admin/users/[uid]/route";
import { GET as listTeams } from "@/app/api/admin/teams/route";
import { DELETE as adminDeleteTeam } from "@/app/api/admin/teams/[id]/route";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { DEFAULT_USER_STATS } from "@/types/firestore";
import * as session from "@/lib/firebase/session";

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

async function seedHostApp(uid: string, status = "pending") {
  await adminDb
    .collection("hostApplications")
    .doc(uid)
    .set({
      uid,
      email: `${uid}@x.test`,
      displayName: uid,
      reason: null,
      status,
      appliedAt: new Date(),
      decidedAt: null,
      decidedBy: null,
    });
}

function asAdmin(uid = "admin") {
  vi.spyOn(session, "verifySession").mockResolvedValue({
    uid,
    email: `${uid}@x.test`,
    emailVerified: true,
  });
}

function asUser(uid: string) {
  vi.spyOn(session, "verifySession").mockResolvedValue({
    uid,
    email: `${uid}@x.test`,
    emailVerified: true,
  });
}

function postReq(body: unknown = {}): Request {
  return new Request("http://localhost/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(clearAll);
afterEach(() => {
  vi.restoreAllMocks();
  return clearAll();
});

describe("GET /api/admin/host-applications", () => {
  it("returns pending applications for admin", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice");
    await seedHostApp("alice", "pending");
    asAdmin();

    const res = await listApps();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { applications: { uid: string }[] };
    expect(body.applications).toHaveLength(1);
    expect(body.applications[0]!.uid).toBe("alice");
  });

  it("returns 403 for non-admin", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await listApps();
    expect(res.status).toBe(403);
  });

  it("returns 401 without session", async () => {
    vi.spyOn(session, "verifySession").mockResolvedValueOnce(null);
    const res = await listApps();
    expect(res.status).toBe(401);
  });
});

describe("POST /api/admin/host-applications/[uid]", () => {
  it("approve: flips application + user.hostStatus", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice", { role: "host", hostStatus: "pending" });
    await seedHostApp("alice", "pending");
    asAdmin();

    const res = await actOnApp(postReq({ action: "approve" }), {
      params: Promise.resolve({ uid: "alice" }),
    });
    expect(res.status).toBe(200);

    const userSnap = await adminDb.collection("users").doc("alice").get();
    expect(userSnap.data()!.hostStatus).toBe("approved");

    const appSnap = await adminDb
      .collection("hostApplications")
      .doc("alice")
      .get();
    expect(appSnap.data()!.status).toBe("approved");
    expect(appSnap.data()!.decidedBy).toBe("admin");
  });

  it("deny: flips application + user.hostStatus to denied", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice", { role: "host", hostStatus: "pending" });
    await seedHostApp("alice", "pending");
    asAdmin();

    const res = await actOnApp(postReq({ action: "deny" }), {
      params: Promise.resolve({ uid: "alice" }),
    });
    expect(res.status).toBe(200);
    const userSnap = await adminDb.collection("users").doc("alice").get();
    expect(userSnap.data()!.hostStatus).toBe("denied");
  });

  it("404 when application doesn't exist", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice");
    asAdmin();
    const res = await actOnApp(postReq({ action: "approve" }), {
      params: Promise.resolve({ uid: "alice" }),
    });
    expect(res.status).toBe(404);
  });

  it("403 for non-admin", async () => {
    await seedUser("alice");
    await seedHostApp("alice");
    asUser("alice");
    const res = await actOnApp(postReq({ action: "approve" }), {
      params: Promise.resolve({ uid: "alice" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/users", () => {
  it("returns user list for admin", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice");
    await seedUser("bob");
    asAdmin();

    const res = await listUsers();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { users: { uid: string }[] };
    const uids = body.users.map((u) => u.uid).sort();
    expect(uids).toEqual(["admin", "alice", "bob"]);
  });

  it("returns 403 for non-admin", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await listUsers();
    expect(res.status).toBe(403);
  });
});

describe("POST /api/admin/users/[uid]", () => {
  it("revoke-host: resets role + hostStatus and denies app", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedHostApp("alice", "approved");
    asAdmin();

    const res = await actOnUser(postReq({ action: "revoke-host" }), {
      params: Promise.resolve({ uid: "alice" }),
    });
    expect(res.status).toBe(200);

    const u = await adminDb.collection("users").doc("alice").get();
    expect(u.data()!.role).toBe("player");
    expect(u.data()!.hostStatus).toBe("none");

    const a = await adminDb.collection("hostApplications").doc("alice").get();
    expect(a.data()!.status).toBe("denied");
  });

  it("delete: cascades through team + auth + sentinels (sole-member team disbands)", async () => {
    await seedUser("admin", { isAdmin: true });
    await adminAuth.createUser({
      uid: "alice",
      email: "alice@x.test",
      password: "password123",
    });
    await seedUser("alice", { teamId: "team-alone" });
    await adminDb
      .collection("teams")
      .doc("team-alone")
      .set({
        teamId: "team-alone",
        name: "Solo",
        inviteCode: "SOLO23",
        captainUid: "alice",
        memberUids: ["alice"],
        createdBy: "alice",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    asAdmin();

    const res = await actOnUser(postReq({ action: "delete" }), {
      params: Promise.resolve({ uid: "alice" }),
    });
    expect(res.status).toBe(200);

    expect((await adminDb.collection("users").doc("alice").get()).exists).toBe(
      false,
    );
    expect(
      (await adminDb.collection("displayNames").doc("alice").get()).exists,
    ).toBe(false);
    expect(
      (await adminDb.collection("teams").doc("team-alone").get()).exists,
    ).toBe(false);
    await expect(adminAuth.getUser("alice")).rejects.toBeDefined();
  });

  it("delete: captain of multi-member team clears captainUid + removes membership", async () => {
    await seedUser("admin", { isAdmin: true });
    await adminAuth.createUser({
      uid: "alice",
      email: "alice@x.test",
      password: "password123",
    });
    await seedUser("alice", { teamId: "t1" });
    await seedUser("bob", { teamId: "t1" });
    await adminDb
      .collection("teams")
      .doc("t1")
      .set({
        teamId: "t1",
        name: "Crew",
        inviteCode: "ABCD23",
        captainUid: "alice",
        memberUids: ["alice", "bob"],
        createdBy: "alice",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    asAdmin();

    const res = await actOnUser(postReq({ action: "delete" }), {
      params: Promise.resolve({ uid: "alice" }),
    });
    expect(res.status).toBe(200);

    const t = await adminDb.collection("teams").doc("t1").get();
    expect(t.data()!.captainUid).toBeNull();
    expect(t.data()!.memberUids).toEqual(["bob"]);
  });

  it("400 if admin targets themselves", async () => {
    await seedUser("admin", { isAdmin: true });
    asAdmin();
    const res = await actOnUser(postReq({ action: "delete" }), {
      params: Promise.resolve({ uid: "admin" }),
    });
    expect(res.status).toBe(400);
  });

  it("403 for non-admin", async () => {
    await seedUser("alice");
    await seedUser("bob");
    asUser("alice");
    const res = await actOnUser(postReq({ action: "delete" }), {
      params: Promise.resolve({ uid: "bob" }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/teams", () => {
  it("returns team list with member counts and captain names", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice");
    await adminDb
      .collection("teams")
      .doc("t1")
      .set({
        teamId: "t1",
        name: "Crew",
        inviteCode: "ABCD23",
        captainUid: "alice",
        memberUids: ["alice"],
        createdBy: "alice",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    asAdmin();

    const res = await listTeams();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      teams: {
        teamId: string;
        memberCount: number;
        captainDisplayName: string | null;
      }[];
    };
    expect(body.teams).toHaveLength(1);
    expect(body.teams[0]!.memberCount).toBe(1);
    expect(body.teams[0]!.captainDisplayName).toBe("alice");
  });

  it("403 for non-admin", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await listTeams();
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/teams/[id]", () => {
  it("admin disbands team, clears member.teamId", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice", { teamId: "t1" });
    await seedUser("bob", { teamId: "t1" });
    await adminDb
      .collection("teams")
      .doc("t1")
      .set({
        teamId: "t1",
        name: "Crew",
        inviteCode: "ABCD23",
        captainUid: "alice",
        memberUids: ["alice", "bob"],
        createdBy: "alice",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    asAdmin();

    const res = await adminDeleteTeam(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(200);

    expect((await adminDb.collection("teams").doc("t1").get()).exists).toBe(
      false,
    );
    for (const uid of ["alice", "bob"]) {
      const u = await adminDb.collection("users").doc(uid).get();
      expect(u.data()!.teamId).toBeNull();
    }
  });

  it("403 for non-admin", async () => {
    await seedUser("alice");
    await adminDb
      .collection("teams")
      .doc("t1")
      .set({
        teamId: "t1",
        name: "Crew",
        inviteCode: "ABCD23",
        captainUid: "alice",
        memberUids: ["alice"],
        createdBy: "alice",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    asUser("alice");
    const res = await adminDeleteTeam(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "t1" }),
    });
    expect(res.status).toBe(403);
  });

  it("404 for unknown team", async () => {
    await seedUser("admin", { isAdmin: true });
    asAdmin();
    const res = await adminDeleteTeam(new Request("http://localhost/x"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});
