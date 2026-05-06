import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

function reqFor(path: string, opts?: { withCookie?: string }): NextRequest {
  const headers = new Headers();
  if (opts?.withCookie) headers.set("cookie", `__session=${opts.withCookie}`);
  return new NextRequest(new URL(`http://localhost${path}`), { headers });
}

describe("middleware (cookie presence gate)", () => {
  it("redirects to /login when no cookie", () => {
    const res = middleware(reqFor("/dashboard"));
    expect(res.status).toBe(307);
    const loc = res.headers.get("location")!;
    expect(loc).toContain("/login");
    expect(loc).toContain("next=%2Fdashboard");
  });

  it("preserves the original path + query in the next param", () => {
    const res = middleware(reqFor("/team/settings?foo=bar"));
    const loc = res.headers.get("location")!;
    expect(loc).toContain("next=%2Fteam%2Fsettings%3Ffoo%3Dbar");
  });

  it("allows through when __session cookie is present", () => {
    const res = middleware(reqFor("/dashboard", { withCookie: "abc.def.ghi" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects when cookie is empty string", () => {
    const res = middleware(reqFor("/dashboard", { withCookie: "" }));
    expect(res.status).toBe(307);
  });
});
