import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  checkDisplayNameSchema,
  toDisplayNameKey,
} from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = checkDisplayNameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid display name",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const normalized = toDisplayNameKey(parsed.data.displayName);
  const snap = await adminDb.collection("displayNames").doc(normalized).get();

  return NextResponse.json({ available: !snap.exists, normalized });
}
