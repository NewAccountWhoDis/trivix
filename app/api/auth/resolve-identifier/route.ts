import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  resolveIdentifierSchema,
  toDisplayNameKey,
} from "@/lib/validation/schemas";

export const runtime = "nodejs";

function looksLikeEmail(s: string): boolean {
  return /@/.test(s);
}

function toE164Phone(s: string): string | null {
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = resolveIdentifierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid identifier" }, { status: 400 });
  }
  const raw = parsed.data.identifier;

  if (looksLikeEmail(raw)) {
    return NextResponse.json({ email: raw.toLowerCase() });
  }

  const e164 = toE164Phone(raw);
  if (e164) {
    const snap = await adminDb
      .collection("users")
      .where("phone", "==", e164)
      .limit(1)
      .get();
    if (snap.empty) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const email = String(snap.docs[0]!.data().email ?? "");
    if (!email) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ email });
  }

  // Treat as username (displayName).
  const key = toDisplayNameKey(raw);
  const dnSnap = await adminDb.collection("displayNames").doc(key).get();
  if (!dnSnap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const uid = String(dnSnap.data()?.uid ?? "");
  if (!uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const userSnap = await adminDb.collection("users").doc(uid).get();
  const email = String(userSnap.data()?.email ?? "");
  if (!email) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ email });
}
