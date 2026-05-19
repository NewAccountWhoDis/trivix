import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { userSearchSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const MAX_RESULTS = 10;
// Firestore prefix-range upper bound: largest BMP code point.
const HIGH = "";

export interface UserSearchHit {
  uid: string;
  displayName: string;
  email: string;
  role: "player" | "host";
  hostStatus: "none" | "pending" | "approved" | "denied";
  mainHostUid: string | null;
  isAdmin: boolean;
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = userSearchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }

  const q = parsed.data.q.toLowerCase();
  const isEmailQuery = q.includes("@");

  const snap = await adminDb
    .collection("users")
    .orderBy(isEmailQuery ? "email" : "displayNameKey")
    .startAt(q)
    .endAt(q + HIGH)
    .limit(MAX_RESULTS)
    .get();

  const results: UserSearchHit[] = snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: String(data.uid ?? d.id),
      displayName: String(data.displayName ?? ""),
      email: String(data.email ?? ""),
      role: (data.role as UserSearchHit["role"]) ?? "player",
      hostStatus:
        (data.hostStatus as UserSearchHit["hostStatus"]) ?? "none",
      mainHostUid: (data.mainHostUid as string | null) ?? null,
      isAdmin: Boolean(data.isAdmin),
    };
  });

  return NextResponse.json({ results });
}
