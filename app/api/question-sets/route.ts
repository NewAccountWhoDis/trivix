import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireApprovedHost } from "@/lib/venues/auth";
import { getHostGroup } from "@/lib/host/scope";
import { createQuestionSetSchema } from "@/lib/validation/schemas";

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
  const parsed = createQuestionSetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const ref = adminDb.collection("questionSets").doc();
  const setId = ref.id;
  const now = FieldValue.serverTimestamp();
  await ref.set({
    setId,
    ownerUid: auth.uid,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    questions: parsed.data.questions,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ ok: true, setId });
}

export async function GET(): Promise<NextResponse> {
  const auth = await requireApprovedHost();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const group = await getHostGroup(auth.uid);
  const snap = await adminDb
    .collection("questionSets")
    .where("ownerUid", "in", group)
    .orderBy("createdAt", "asc")
    .get();

  const sets = snap.docs.map((d) => {
    const data = d.data();
    const questions = (data.questions as unknown[] | undefined) ?? [];
    return {
      setId: d.id,
      ownerUid: String(data.ownerUid ?? auth.uid),
      name: String(data.name ?? ""),
      description: (data.description as string | null) ?? null,
      questionCount: questions.length,
      createdAt: tsToMs(data.createdAt),
      updatedAt: tsToMs(data.updatedAt),
    };
  });

  return NextResponse.json({ sets });
}
