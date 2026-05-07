import { describe, expect, it } from "vitest";
import {
  hostApplicationActionSchema,
  userActionSchema,
} from "@/lib/validation/schemas";

describe("hostApplicationActionSchema", () => {
  it("accepts approve and deny", () => {
    expect(hostApplicationActionSchema.parse({ action: "approve" })).toEqual({
      action: "approve",
    });
    expect(hostApplicationActionSchema.parse({ action: "deny" })).toEqual({
      action: "deny",
    });
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
