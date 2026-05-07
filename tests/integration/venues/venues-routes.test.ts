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
import { POST as createVenue, GET as listMine } from "@/app/api/venues/route";
import {
  GET as getVenue,
  PATCH as updateVenue,
  DELETE as deleteVenue,
} from "@/app/api/venues/[id]/route";
import { GET as adminListVenues } from "@/app/api/admin/venues/route";
import { DELETE as adminDeleteVenue } from "@/app/api/admin/venues/[id]/route";
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

async function seedVenue(ownerUid: string, name = "Joe's Pub", id?: string) {
  const ref = id
    ? adminDb.collection("venues").doc(id)
    : adminDb.collection("venues").doc();
  await ref.set({
    venueId: ref.id,
    ownerUid,
    name,
    address: { street: "123 Main", city: "Albany", state: "NY", zip: "12207" },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return ref.id;
}

function asUser(
  uid: string,
  opts: { emailVerified?: boolean } = {},
) {
  vi.spyOn(session, "verifySession").mockResolvedValue({
    uid,
    email: `${uid}@x.test`,
    emailVerified: opts.emailVerified ?? true,
  });
}

const VALID_BODY = {
  name: "Joe's Pub",
  address: { street: "123 Main", city: "Albany", state: "NY", zip: "12207" },
};

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

describe("POST /api/venues (host create)", () => {
  it("approved host creates a venue", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    asUser("alice");
    const res = await createVenue(jsonReq("POST", VALID_BODY));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { venueId: string };
    expect(body.venueId).toBeTruthy();
    const v = await adminDb.collection("venues").doc(body.venueId).get();
    expect(v.data()!.ownerUid).toBe("alice");
    expect(v.data()!.name).toBe("Joe's Pub");
  });

  it("403 for non-approved host (player)", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await createVenue(jsonReq("POST", VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("403 for pending host", async () => {
    await seedUser("alice", { role: "host", hostStatus: "pending" });
    asUser("alice");
    const res = await createVenue(jsonReq("POST", VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("403 for unverified email", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    asUser("alice", { emailVerified: false });
    const res = await createVenue(jsonReq("POST", VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("400 on bad address", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    asUser("alice");
    const res = await createVenue(
      jsonReq("POST", {
        ...VALID_BODY,
        address: { ...VALID_BODY.address, zip: "abc" },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/venues (host list)", () => {
  it("returns only own venues", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedUser("bob", { role: "host", hostStatus: "approved" });
    await seedVenue("alice", "Joe's Pub");
    await seedVenue("alice", "The Tap Room");
    await seedVenue("bob", "Bob's Bar");
    asUser("alice");
    const res = await listMine();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { venues: { name: string }[] };
    expect(body.venues.map((v) => v.name).sort()).toEqual([
      "Joe's Pub",
      "The Tap Room",
    ]);
  });
});

describe("GET /api/venues/[id]", () => {
  it("owner can read their own venue", async () => {
    await seedUser("alice");
    const venueId = await seedVenue("alice");
    asUser("alice");
    const res = await getVenue(jsonReq("GET"), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(200);
  });

  it("admin can read any venue", async () => {
    await seedUser("admin", { isAdmin: true });
    const venueId = await seedVenue("alice");
    asUser("admin");
    const res = await getVenue(jsonReq("GET"), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(200);
  });

  it("non-owner non-admin gets 403", async () => {
    await seedUser("eve");
    const venueId = await seedVenue("alice");
    asUser("eve");
    const res = await getVenue(jsonReq("GET"), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(403);
  });

  it("404 for unknown id", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await getVenue(jsonReq("GET"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/venues/[id]", () => {
  it("owner updates name + address", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    const venueId = await seedVenue("alice", "Old Name");
    asUser("alice");
    const res = await updateVenue(
      jsonReq("PATCH", { ...VALID_BODY, name: "New Name" }),
      { params: Promise.resolve({ id: venueId }) },
    );
    expect(res.status).toBe(200);
    const v = await adminDb.collection("venues").doc(venueId).get();
    expect(v.data()!.name).toBe("New Name");
  });

  it("403 for non-owner host", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedUser("bob", { role: "host", hostStatus: "approved" });
    const venueId = await seedVenue("alice");
    asUser("bob");
    const res = await updateVenue(jsonReq("PATCH", VALID_BODY), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/venues/[id]", () => {
  it("owner deletes their venue", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    const venueId = await seedVenue("alice");
    asUser("alice");
    const res = await deleteVenue(jsonReq("DELETE"), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(200);
    expect(
      (await adminDb.collection("venues").doc(venueId).get()).exists,
    ).toBe(false);
  });

  it("403 for non-owner host", async () => {
    await seedUser("alice", { role: "host", hostStatus: "approved" });
    await seedUser("bob", { role: "host", hostStatus: "approved" });
    const venueId = await seedVenue("alice");
    asUser("bob");
    const res = await deleteVenue(jsonReq("DELETE"), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/admin/venues", () => {
  it("admin lists all venues with owner names", async () => {
    await seedUser("admin", { isAdmin: true });
    await seedUser("alice");
    await seedVenue("alice", "Joe's Pub");
    asUser("admin");
    const res = await adminListVenues();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      venues: { name: string; ownerDisplayName: string | null }[];
    };
    expect(body.venues).toHaveLength(1);
    expect(body.venues[0]!.name).toBe("Joe's Pub");
    expect(body.venues[0]!.ownerDisplayName).toBe("alice");
  });

  it("403 for non-admin", async () => {
    await seedUser("alice");
    asUser("alice");
    const res = await adminListVenues();
    expect(res.status).toBe(403);
  });
});

describe("DELETE /api/admin/venues/[id]", () => {
  it("admin deletes any venue", async () => {
    await seedUser("admin", { isAdmin: true });
    const venueId = await seedVenue("alice");
    asUser("admin");
    const res = await adminDeleteVenue(jsonReq("DELETE"), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(200);
  });

  it("403 for non-admin", async () => {
    await seedUser("alice");
    const venueId = await seedVenue("alice");
    asUser("alice");
    const res = await adminDeleteVenue(jsonReq("DELETE"), {
      params: Promise.resolve({ id: venueId }),
    });
    expect(res.status).toBe(403);
  });

  it("404 for unknown id", async () => {
    await seedUser("admin", { isAdmin: true });
    asUser("admin");
    const res = await adminDeleteVenue(jsonReq("DELETE"), {
      params: Promise.resolve({ id: "missing" }),
    });
    expect(res.status).toBe(404);
  });
});
