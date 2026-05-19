import { describe, expect, it } from "vitest";
import {
  hostApplicationActionSchema,
  userActionSchema,
} from "@/lib/validation/schemas";

describe("hostApplicationActionSchema", () => {
  it("accepts deny without extra fields", () => {
    expect(hostApplicationActionSchema.parse({ action: "deny" })).toMatchObject(
      { action: "deny" },
    );
  });
  it("accepts approve as a main host with expiration and cap", () => {
    expect(
      hostApplicationActionSchema.parse({
        action: "approve",
        hostExpiresAt: "2027-01-01",
        subHostCap: 5,
      }),
    ).toMatchObject({
      action: "approve",
      hostExpiresAt: "2027-01-01",
      subHostCap: 5,
    });
  });
  it("accepts approve as a sub-host with mainHostUid", () => {
    expect(
      hostApplicationActionSchema.parse({
        action: "approve",
        mainHostUid: "abc123",
      }),
    ).toMatchObject({ action: "approve", mainHostUid: "abc123" });
  });
  it("rejects approve with no main and no expiration", () => {
    expect(() =>
      hostApplicationActionSchema.parse({ action: "approve" }),
    ).toThrow();
  });
  it("rejects malformed expiration date", () => {
    expect(() =>
      hostApplicationActionSchema.parse({
        action: "approve",
        hostExpiresAt: "01/01/2027",
        subHostCap: 0,
      }),
    ).toThrow();
  });
  it("rejects other actions", () => {
    expect(() =>
      hostApplicationActionSchema.parse({ action: "delete" }),
    ).toThrow();
  });
  it("rejects missing action", () => {
    expect(() => hostApplicationActionSchema.parse({})).toThrow();
  });
});

describe("userActionSchema", () => {
  it("accepts revoke-host and delete", () => {
    expect(userActionSchema.parse({ action: "revoke-host" })).toEqual({
      action: "revoke-host",
    });
    expect(userActionSchema.parse({ action: "delete" })).toEqual({
      action: "delete",
    });
  });
  it("rejects other actions", () => {
    expect(() => userActionSchema.parse({ action: "promote" })).toThrow();
    expect(() => userActionSchema.parse({ action: "approve" })).toThrow();
  });
});
