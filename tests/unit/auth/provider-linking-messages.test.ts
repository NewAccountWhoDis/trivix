import { describe, expect, it } from "vitest";
import {
  formatGoogleSignInRequiredMessage,
  formatLinkRequiredMessage,
} from "@/lib/auth/messages";

describe("provider-linking messages", () => {
  it("link-required prompt mentions email and Google", () => {
    const msg = formatLinkRequiredMessage("joe@example.com");
    expect(msg).toContain("joe@example.com");
    expect(msg).toContain("password");
    expect(msg).toContain("Google");
  });

  it("google-sign-in-required prompt mentions email and Google", () => {
    const msg = formatGoogleSignInRequiredMessage("joe@example.com");
    expect(msg).toContain("joe@example.com");
    expect(msg).toContain("Google");
  });
});
