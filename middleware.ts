import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "__session";

export function middleware(request: NextRequest): NextResponse {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie.length > 0) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const next = `${url.pathname}${url.search}`;
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/team/:path*",
    "/profile/:path*",
    "/u/:path*",
    "/host/:path*",
    "/admin/:path*",
  ],
};
