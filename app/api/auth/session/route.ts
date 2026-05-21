import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/firebase/session";
import { adminAuth } from "@/lib/firebase/admin";
import { getClientIp, recordLogin } from "@/lib/sessions/record";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idToken =
    body && typeof body === "object" && "idToken" in body
      ? (body as { idToken?: unknown }).idToken
      : undefined;

  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    await setSessionCookie(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid idToken" }, { status: 401 });
  }

  // Record the login (IP + device) for admin review — best-effort.
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    await recordLogin({
      uid: decoded.uid,
      ip: getClientIp(request),
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
  } catch {
    // Don't fail the login if recording the session fails.
  }

  return NextResponse.json({ ok: true });
}
