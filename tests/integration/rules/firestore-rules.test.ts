// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "trivix-rules-test",
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf-8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}, 30000);

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe("firestore.rules — users/{uid}", () => {
  it("owner can read own doc", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice"), { uid: "alice" });
    });
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "users/alice")));
  });

  it("non-owner cannot read another user's doc", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice"), { uid: "alice" });
    });
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
  });

  it("unauthenticated cannot read", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users/alice"), { uid: "alice" });
    });
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users/alice")));
  });

  it("owner cannot write own doc (server-only)", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "users/alice"), { uid: "alice" }));
  });
});

describe("firestore.rules — displayNames/{key}", () => {
  it("authenticated user cannot read sentinel", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "displayNames/joe"), { uid: "alice" });
    });
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "displayNames/joe")));
  });

  it("authenticated user cannot write sentinel", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "displayNames/joe"), { uid: "alice" }));
  });
});

describe("firestore.rules — hostApplications/{uid}", () => {
  it("owner can read own application", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "hostApplications/alice"), {
        uid: "alice",
        status: "pending",
      });
    });
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "hostApplications/alice")));
  });

  it("non-owner cannot read another user's application", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "hostApplications/alice"), {
        uid: "alice",
        status: "pending",
      });
    });
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "hostApplications/alice")));
  });

  it("owner cannot write own application (server-only)", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "hostApplications/alice"), {
        uid: "alice",
        status: "pending",
      }),
    );
  });
});

describe("firestore.rules — teams/{teamId}", () => {
  async function seedTeam(captainUid: string, memberUids: string[]) {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "teams/t1"), {
        teamId: "t1",
        name: "Quiz Crew",
        inviteCode: "ABC234",
        captainUid,
        memberUids,
        createdBy: captainUid,
      });
    });
  }

  it("captain can read the team doc", async () => {
    await seedTeam("alice", ["alice", "bob"]);
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "teams/t1")));
  });

  it("member can read the team doc", async () => {
    await seedTeam("alice", ["alice", "bob"]);
    const db = env.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(db, "teams/t1")));
  });

  it("non-member cannot read the team doc", async () => {
    await seedTeam("alice", ["alice", "bob"]);
    const db = env.authenticatedContext("eve").firestore();
    await assertFails(getDoc(doc(db, "teams/t1")));
  });

  it("nobody can write the team doc (server-only)", async () => {
    await seedTeam("alice", ["alice", "bob"]);
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "teams/t1"), { name: "Renamed" }, { merge: true }),
    );
  });
});

describe("firestore.rules — teams/{teamId}/joinRequests/{uid}", () => {
  async function seedTeam() {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "teams/t1"), {
        teamId: "t1",
        name: "Quiz Crew",
        inviteCode: "ABC234",
        captainUid: "alice",
        memberUids: ["alice"],
        createdBy: "alice",
      });
    });
  }

  it("requester can create their own request doc", async () => {
    await seedTeam();
    const db = env.authenticatedContext("bob").firestore();
    await assertSucceeds(
      setDoc(doc(db, "teams/t1/joinRequests/bob"), {
        uid: "bob",
        displayName: "bob",
        requestedAt: new Date(),
      }),
    );
  });

  it("requester cannot create someone else's request", async () => {
    await seedTeam();
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(db, "teams/t1/joinRequests/eve"), {
        uid: "eve",
        displayName: "eve",
        requestedAt: new Date(),
      }),
    );
  });

  it("rejects request with mismatched uid field", async () => {
    await seedTeam();
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(db, "teams/t1/joinRequests/bob"), {
        uid: "alice",
        displayName: "bob",
        requestedAt: new Date(),
      }),
    );
  });

  it("rejects request with extra fields", async () => {
    await seedTeam();
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(doc(db, "teams/t1/joinRequests/bob"), {
        uid: "bob",
        displayName: "bob",
        requestedAt: new Date(),
        sneaky: "isAdmin",
      }),
    );
  });

  it("captain can read all pending requests on their team", async () => {
    await seedTeam();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "teams/t1/joinRequests/bob"), {
        uid: "bob",
        displayName: "bob",
        requestedAt: new Date(),
      });
    });
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "teams/t1/joinRequests/bob")));
  });

  it("requester can read their own request", async () => {
    await seedTeam();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "teams/t1/joinRequests/bob"), {
        uid: "bob",
        displayName: "bob",
        requestedAt: new Date(),
      });
    });
    const db = env.authenticatedContext("bob").firestore();
    await assertSucceeds(getDoc(doc(db, "teams/t1/joinRequests/bob")));
  });

  it("unrelated user cannot read other requests", async () => {
    await seedTeam();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "teams/t1/joinRequests/bob"), {
        uid: "bob",
        displayName: "bob",
        requestedAt: new Date(),
      });
    });
    const db = env.authenticatedContext("eve").firestore();
    await assertFails(getDoc(doc(db, "teams/t1/joinRequests/bob")));
  });

  it("requester cannot update or delete their own request", async () => {
    await seedTeam();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "teams/t1/joinRequests/bob"), {
        uid: "bob",
        displayName: "bob",
        requestedAt: new Date(),
      });
    });
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(
      setDoc(
        doc(db, "teams/t1/joinRequests/bob"),
        { displayName: "renamed" },
        { merge: true },
      ),
    );
  });
});

describe("firestore.rules — venues/{venueId}", () => {
  async function seedVenue(ownerUid: string, venueId = "v1") {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `venues/${venueId}`), {
        venueId,
        ownerUid,
        name: "Joe's Pub",
        address: {
          street: "123 Main",
          city: "Albany",
          state: "NY",
          zip: "12207",
        },
      });
    });
  }

  it("owner host can read own venue", async () => {
    await seedVenue("alice");
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "venues/v1")));
  });

  it("non-owner cannot read another host's venue", async () => {
    await seedVenue("alice");
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "venues/v1")));
  });

  it("unauthenticated cannot read", async () => {
    await seedVenue("alice");
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "venues/v1")));
  });

  it("nobody can write venues directly (server-only)", async () => {
    await seedVenue("alice");
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "venues/v1"), { name: "Renamed" }, { merge: true }),
    );
  });

  it("client cannot create a venue directly", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "venues/new"), {
        venueId: "new",
        ownerUid: "alice",
        name: "Joe's Pub",
        address: {
          street: "123 Main",
          city: "Albany",
          state: "NY",
          zip: "12207",
        },
      }),
    );
  });
});

describe("firestore.rules — questionSets/{setId}", () => {
  async function seedSet(ownerUid: string, setId = "qs1") {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `questionSets/${setId}`), {
        setId,
        ownerUid,
        name: "Capitals",
        description: null,
        questions: [],
      });
    });
  }

  it("owner host can read own set", async () => {
    await seedSet("alice");
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "questionSets/qs1")));
  });

  it("non-owner cannot read another host's set", async () => {
    await seedSet("alice");
    const db = env.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(db, "questionSets/qs1")));
  });

  it("nobody can write question sets directly", async () => {
    await seedSet("alice");
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(
        doc(db, "questionSets/qs1"),
        { name: "Renamed" },
        { merge: true },
      ),
    );
  });

  it("client cannot create a question set directly", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(
      setDoc(doc(db, "questionSets/new"), {
        setId: "new",
        ownerUid: "alice",
        name: "X",
        description: null,
        questions: [],
      }),
    );
  });
});

describe("firestore.rules — admin reads", () => {
  async function seedAdminAndOthers() {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "users/admin1"), { uid: "admin1", isAdmin: true });
      await setDoc(doc(db, "users/alice"), { uid: "alice", isAdmin: false });
      await setDoc(doc(db, "users/bob"), { uid: "bob", isAdmin: false });
      await setDoc(doc(db, "teams/t1"), {
        teamId: "t1",
        name: "Quiz Crew",
        inviteCode: "ABC234",
        captainUid: "alice",
        memberUids: ["alice"],
        createdBy: "alice",
      });
      await setDoc(doc(db, "hostApplications/bob"), {
        uid: "bob",
        status: "pending",
      });
      await setDoc(doc(db, "teams/t1/joinRequests/eve"), {
        uid: "eve",
        displayName: "eve",
        requestedAt: new Date(),
      });
      await setDoc(doc(db, "venues/v1"), {
        venueId: "v1",
        ownerUid: "bob",
        name: "Joe's Pub",
        address: {
          street: "123 Main",
          city: "Albany",
          state: "NY",
          zip: "12207",
        },
      });
      await setDoc(doc(db, "questionSets/qs1"), {
        setId: "qs1",
        ownerUid: "bob",
        name: "Capitals",
        description: null,
        questions: [],
      });
    });
  }

  it("admin can read any user doc", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertSucceeds(getDoc(doc(db, "users/alice")));
    await assertSucceeds(getDoc(doc(db, "users/bob")));
  });

  it("admin can read any team doc (even non-member teams)", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertSucceeds(getDoc(doc(db, "teams/t1")));
  });

  it("admin can read any host application", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertSucceeds(getDoc(doc(db, "hostApplications/bob")));
  });

  it("admin can read any team join request", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertSucceeds(getDoc(doc(db, "teams/t1/joinRequests/eve")));
  });

  it("admin can read any venue (even non-owned)", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertSucceeds(getDoc(doc(db, "venues/v1")));
  });

  it("admin can read any question set", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertSucceeds(getDoc(doc(db, "questionSets/qs1")));
  });

  it("admin still cannot write users (server-only)", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertFails(
      setDoc(doc(db, "users/alice"), { foo: "bar" }, { merge: true }),
    );
  });

  it("admin still cannot write teams or join requests", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("admin1").firestore();
    await assertFails(
      setDoc(doc(db, "teams/t1"), { name: "Renamed" }, { merge: true }),
    );
  });

  it("non-admin cannot read other users", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "users/bob")));
  });

  it("user with isAdmin=false on their doc has no admin powers", async () => {
    await seedAdminAndOthers();
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "hostApplications/bob")));
  });
});

describe("firestore.rules — default deny", () => {
  it("denies reads on unknown collections", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(db, "unknownCollection/x")));
  });

  it("denies writes on unknown collections", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, "unknownCollection/x"), { foo: "bar" }));
  });
});
