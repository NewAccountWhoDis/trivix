import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedHost } from "@/lib/venues/auth";
import { createGameSchema } from "@/lib/validation/schemas";
import type { GameSection } from "@/types/firestore";

export const runtime = "nodejs";

function tsToMs(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return 0;
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ref = adminDb.collection("games").doc();
  const gameId = ref.id;
  const now = FieldValue.serverTimestamp();
  await ref.set({
    gameId,
    ownerUid: auth.uid,
    hostUids: [auth.uid],
    name: parsed.data.name,
    sections: [] as GameSection[],
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, gameId });
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Games the caller owns or has been assigned to (hostUids contains them).
  const snap = await adminDb
    .collection("games")
    .where("hostUids", "array-contains", auth.uid)
    .orderBy("createdAt", "asc")
    .get();

  const games = snap.docs.map((d) => {
    const data = d.data();
    const sections = (data.sections as GameSection[] | undefined) ?? [];
    const questionCount = sections.reduce(
      (n, s) => n + (s.questions?.length ?? 0),
      0,
    );
    return {
      gameId: d.id,
      ownerUid: String(data.ownerUid ?? ""),
      name: String(data.name ?? ""),
      ownedByMe: String(data.ownerUid ?? "") === auth.uid,
      sectionCount: sections.length,
      questionCount,
      createdAt: tsToMs(data.createdAt),
      updatedAt: tsToMs(data.updatedAt),
    };
  });

  return NextResponse.json({ games });
}
