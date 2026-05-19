import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export const runtime = "nodejs";

const ERR_NOT_FOUND = "NOT_FOUND";
const ERR_NOT_OWNED = "NOT_OWNED";

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ subUid: string }> },
): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { subUid } = await ctx.params;
  const callerRef = adminDb.collection("users").doc(session.uid);
  const subRef = adminDb.collection("users").doc(subUid);

  try {
    await adminDb.runTransaction(async (tx) => {
      const callerSnap = await tx.get(callerRef);
      const subSnap = await tx.get(subRef);
      if (!subSnap.exists) throw new Error(ERR_NOT_FOUND);
      const sub = subSnap.data() ?? {};
      const caller = callerSnap.exists ? (callerSnap.data() ?? {}) : {};
      const callerIsOwner = (sub.mainHostUid ?? null) === session.uid;
      const callerIsAdmin = Boolean(caller.isAdmin);
      if (!callerIsOwner && !callerIsAdmin) throw new Error(ERR_NOT_OWNED);

      const mainUid = (sub.mainHostUid ?? null) as string | null;
      const now = FieldValue.serverTimestamp();

      tx.update(subRef, {
        role: "player",
        hostStatus: "denied",
        mainHostUid: null,
        updatedAt: now,
      });

      if (mainUid) {
        const mainRef = adminDb.collection("users").doc(mainUid);
        await tx.get(mainRef);
        tx.update(mainRef, {
          subHostUids: FieldValue.arrayRemove(subUid),
          updatedAt: now,
        });
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_NOT_FOUND) {
      return NextResponse.json(
        { error: "Sub-host not found" },
        { status: 404 },
      );
    }
    if (msg === ERR_NOT_OWNED) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Remove failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
