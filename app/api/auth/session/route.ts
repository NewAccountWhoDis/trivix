import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/firebase/session";

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
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid idToken" }, { status: 401 });
  }
}
