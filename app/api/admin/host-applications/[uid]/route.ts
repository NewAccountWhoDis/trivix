import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { hostApplicationActionSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ uid: string }> },
): Promise<NextResponse> {
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
  const parsed = hostApplicationActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const { uid } = await ctx.params;
  const appRef = adminDb.collection("hostApplications").doc(uid);
  const userRef = adminDb.collection("users").doc(uid);
  const now = FieldValue.serverTimestamp();
  const newStatus = parsed.data.action === "approve" ? "approved" : "denied";

  try {
    await adminDb.runTransaction(async (tx) => {
      const appSnap = await tx.get(appRef);
      if (!appSnap.exists) throw new Error("APP_NOT_FOUND");
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      tx.update(appRef, {
        status: newStatus,
        decidedAt: now,
        decidedBy: auth.uid,
      });
      tx.update(userRef, {
        hostStatus: newStatus === "approved" ? "approved" : "denied",
        updatedAt: now,
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "APP_NOT_FOUND") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    if (msg === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
