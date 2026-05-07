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
import {
  POST as createSet,
  GET as listMine,
} from "@/app/api/question-sets/route";
import {
  GET as getSet,
  PATCH as updateSet,
  DELETE as deleteSet,
} from "@/app/api/question-sets/[id]/route";
import { GET as adminListSets } from "@/app/api/admin/question-sets/route";
import { DELETE as adminDeleteSet } from "@/app/api/admin/question-sets/[id]/route";
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

const Q = (correctIndex = 0) => ({
  prompt: "What is the capital of New York?",
  choices: ["Albany", "NYC", "Buffalo", "Syracuse"],
  correctIndex,
  points: 1,
});

const VALID_BODY = { name: "Capitals", questions: [Q()] };

async function seedSet(ownerUid: string, name = "Capitals", id?: string) {
  const ref = id
    ? adminDb.collection("questionSets").doc(id)
    : adminDb.collection("questionSets").doc();
  await ref.set({
    setId: ref.id,
    ownerUid,
    name,
    description: null,
    questions: [Q()],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

function asUser(uid: string, opts: { emailVerified?: boolean } = {}) {
  vi.spyOn(session, "verifySession").mockResolvedValue({
    uid,
    email: `${uid}@x.test`,
    emailVerified: opts.emailVerified ?? true,
  });
}

function jsonReq(method: string, body?: unknown): Request {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new Request("http://localhost/x", init);
}

beforeEach(clearFirestore);
afterEach(() => {
  vi.restoreAllMocks();
  return clearFirestore();
});

describe("POST /api/question-sets", () => {
  it("approved host creates a set", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    asUser("alice");
    const res = await createSet(jsonReq("POST", VALID_BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { setId: string };
    const s = await adminDb.collection("questionSets").doc(body.setId).get();
    expect(s.data()!.ownerUid).toBe("alice");
    expect(s.data()!.questions).toHaveLength(1);
  });

  it("403 for player", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await createSet(jsonReq("POST", VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("400 on empty questions array", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    asUser("alice");
    const res = await createSet(
      jsonReq("POST", { ...VALID_BODY, questions: [] }),
    );
    expect(res.status).toBe(400);
  });

  it("400 on bad correctIndex", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    asUser("alice");
    const res = await createSet(
      jsonReq("POST", { ...VALID_BODY, questions: [{ ...Q(), correctIndex: 4 }] }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/question-sets", () => {
  it("returns own sets only", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedUser("bob", { role: "host", hostStatus: "approved" });
    await seedSet("alice", "Capitals");
    await seedSet("alice", "Geography");
    await seedSet("bob", "Bob's Set");
    asUser("alice");
    const res = await listMine();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sets: { name: string; questionCount: number }[];
    };
    expect(body.sets.map((s) => s.name).sort()).toEqual([
      "Capitals",
      "Geography",
    ]);
    expect(body.sets[0]!.questionCount).toBe(1);
  });
});

describe("GET /api/question-sets/[id]", () => {
  it("owner reads full set with questions", async () => {
    await seedUser("alice");
    const setId = await seedSet("alice");
    asUser("alice");
    const res = await getSet(jsonReq("GET"), {
      params: Promise.resolve({ id: setId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { questions: unknown[] };
    expect(body.questions).toHaveLength(1);
  });

  it("admin can read any set", async () => {
    await seedUser("admin", { isAdmin: true });
    const setId = await seedSet("alice");
    asUser("admin");
    const res = await getSet(jsonReq("GET"), {
      params: Promise.resolve({ id: setId }),
    });
    expect(res.status).toBe(200);
  });

  it("non-owner non-admin gets 403", async () => {
    await seedUser("eve");
    const setId = await seedSet("alice");
    asUser("eve");
    const res = await getSet(jsonReq("GET"), {
      params: Promise.resolve({ id: setId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/question-sets/[id]", () => {
  it("owner updates name + questions", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    const setId = await seedSet("alice", "Old");
    asUser("alice");
    const res = await updateSet(
      jsonReq("PATCH", {
        name: "New",
        description: "now with description",
        questions: [Q(1), Q(2)],
      }),
      { params: Promise.resolve({ id: setId }) },
    );
    expect(res.status).toBe(200);
    const s = await adminDb.collection("questionSets").doc(setId).get();
    expect(s.data()!.name).toBe("New");
    expect(s.data()!.description).toBe("now with description");
    expect(s.data()!.questions).toHaveLength(2);
  });

  it("403 for non-owner", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedUser("bob", { role: "host", hostStatus: "approved" });
    const setId = await seedSet("alice");
    asUser("bob");
    const res = await updateSet(jsonReq("PATCH", VALID_BODY), {
      params: Promise.resolve({ id: setId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/question-sets/[id]", () => {
  it("owner deletes their set", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    const setId = await seedSet("alice");
    asUser("alice");
    const res = await deleteSet(jsonReq("DELETE"), {
      params: Promise.resolve({ id: setId }),
    });
    expect(res.status).toBe(200);
    expect(
      (await adminDb.collection("questionSets").doc(setId).get()).exists,
    ).toBe(false);
  });
});

describe("GET /api/admin/question-sets", () => {
  it("admin lists all with owner display name + question count", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice");
    await seedSet("alice", "Capitals");
    asUser("admin");
    const res = await adminListSets();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sets: {
        name: string;
        ownerDisplayName: string | null;
        questionCount: number;
      }[];
    };
    expect(body.sets).toHaveLength(1);
    expect(body.sets[0]!.ownerDisplayName).toBe("alice");
    expect(body.sets[0]!.questionCount).toBe(1);
  });

  it("403 for non-admin", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await adminListSets();
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/question-sets/[id]", () => {
  it("admin deletes any set", async () => {
    await seedUser("admin", { isAdmin: true });
    const setId = await seedSet("alice");
    asUser("admin");
    const res = await adminDeleteSet(jsonReq("DELETE"), {
      params: Promise.resolve({ id: setId }),
    });
    expect(res.status).toBe(200);
  });

  it("404 for unknown id", async () => {
    await seedUser("admin", { isAdmin: true });
    asUser("admin");
    const res = await adminDeleteSet(jsonReq("DELETE"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});
