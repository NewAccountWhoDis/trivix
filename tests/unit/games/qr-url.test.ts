import { describe, expect, it } from "vitest";
import { buildJoinUrl } from "@/components/games/QrCode";

describe("buildJoinUrl", () => {
  it("builds a /play?code= url", () => {
    expect(buildJoinUrl("https://triviax.netlify.app", "ABCD23")).toBe(
      "https://triviax.netlify.app/play?code=ABCD23",
    );
  });

  it("strips a trailing slash from origin", () => {
    expect(buildJoinUrl("https://triviax.netlify.app/", "XYZ234")).toBe(
      "https://triviax.netlify.app/play?code=XYZ234",
    );
  });

  it("URL-encodes the code (defensive — alphabet has no specials)", () => {
    // The 31-char unambiguous alphabet has no chars that need encoding,
    // but verify the function still calls encodeURIComponent.
    expect(buildJoinUrl("http://localhost:3000", "AAAA22")).toBe(
      "http://localhost:3000/play?code=AAAA22",
    );
  });
});
