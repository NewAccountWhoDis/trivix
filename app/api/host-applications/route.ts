import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { requestHostAccessSchema } from "@/lib/validation/schemas";
import { notifyAdmins } from "@/lib/notifications/dispatch";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const parsed = requestHostAccessSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const userRef = adminDb.collection("users").doc(session.uid);
  const appRef = adminDb.collection("hostApplications").doc(session.uid);
  const now = FieldValue.serverTimestamp();

  try {
    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      const u = userSnap.data() ?? {};
      if (u.hostStatus === "approved") {
        throw new Error("ALREADY_APPROVED");
      }
      if (u.hostStatus === "pending") {
        throw new Error("ALREADY_PENDING");
      }

      tx.set(appRef, {
        uid: session.uid,
        email: String(u.email ?? ""),
        displayName: String(u.displayName ?? ""),
        reason: parsed.data.reason ?? null,
        status: "pending",
        appliedAt: now,
        decidedAt: null,
        decidedBy: null,
      });
      tx.update(userRef, {
        role: "host",
        hostStatus: "pending",
        updatedAt: now,
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (msg === "ALREADY_APPROVED") {
      return NextResponse.json(
        { error: "You're already an approved host." },
        { status: 409 },
      );
    }
    if (msg === "ALREADY_PENDING") {
      return NextResponse.json(
        { error: "You already have a pending application." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Couldn't submit application." },
      { status: 500 },
    );
  }

  const u = (await userRef.get()).data() ?? {};
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  await notifyAdmins("newHostRequest", {
    subject: "Trivix: new host application",
    body: `${String(u.displayName ?? session.uid)} (${String(u.email ?? "no email")}) applied to host.\n\nReview: ${site}/admin/host-applications`,
  });

  return NextResponse.json({ ok: true });
}
