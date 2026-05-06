// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
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
      rules: readFileSync(
        resolve(process.cwd(), "firestore.rules"),
        "utf-8",
      ),
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
