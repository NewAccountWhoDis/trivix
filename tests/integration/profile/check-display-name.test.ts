// @vitest-environment node
import "@/tests/setup/emulator-bootstrap";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/profile/check-display-name/route";
import { adminDb } from "@/lib/firebase/admin";

const FS_EMU = "http://127.0.0.1:8080";
const PROJECT = "trivix-dev";

async function clearFirestoreEmulator() {
  await fetch(
    `${FS_EMU}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

function postBody(body: unknown): Request {
  return new Request("http://localhost/api/profile/check-display-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(clearFirestoreEmulator);
afterEach(clearFirestoreEmulator);

describe("POST /api/profile/check-display-name", () => {
  it("returns available=true for an unused name", async () => {
    const res = await POST(postBody({ displayName: "fresh_name" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      available: boolean;
      normalized: string;
    };
    expect(body).toEqual({ available: true, normalized: "fresh_name" });
  });

  it("returns available=false for a claimed name", async () => {
    await adminDb
      .collection("displayNames")
      .doc("taken_name")
      .set({ uid: "someone" });

    const res = await POST(postBody({ displayName: "Taken_Name" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      available: boolean;
      normalized: string;
    };
    expect(body).toEqual({ available: false, normalized: "taken_name" });
  });

  it("returns 400 for invalid format", async () => {
    const res = await POST(postBody({ displayName: "no spaces" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for too short", async () => {
    const res = await POST(postBody({ displayName: "ab" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing field", async () => {
    const res = await POST(postBody({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await POST(
      new Request("http://localhost/api/profile/check-display-name", {
        method: "POST",
        body: "not-json",
      }),
    );
    expect(res.status).toBe(400);
  });
});
