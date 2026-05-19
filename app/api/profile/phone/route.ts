import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";

export const runtime = "nodejs";

const ERR_PHONE_TAKEN = "PHONE_TAKEN";
const ERR_NO_PHONE_ON_TOKEN = "NO_PHONE_ON_TOKEN";

export async function PATCH(request: Request): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const idToken =
    body && typeof body === "object" && "idToken" in body
      ? String((body as { idToken: unknown }).idToken ?? "")
      : "";
  if (!idToken) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid idToken" }, { status: 401 });
  }
  if (decoded.uid !== session.uid) {
    return NextResponse.json({ error: "Token mismatch" }, { status: 401 });
  }

  const newPhone =
    typeof decoded.phone_number === "string" ? decoded.phone_number : "";
  if (!newPhone) {
    return NextResponse.json(
      { error: "Phone not present on token" },
      { status: 400 },
    );
  }

  const userRef = adminDb.collection("users").doc(session.uid);

  try {
    await adminDb.runTransaction(async (tx) => {
      const conflictSnap = await adminDb
        .collection("users")
        .where("phone", "==", newPhone)
        .limit(2)
        .get();
      const conflict = conflictSnap.docs.find((d) => d.id !== session.uid);
      if (conflict) throw new Error(ERR_PHONE_TAKEN);

      tx.update(userRef, {
        phone: newPhone,
        phoneVerified: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_PHONE_TAKEN) {
      return NextResponse.json(
        { error: "That phone number is already used by another account." },
        { status: 409 },
      );
    }
    if (msg === ERR_NO_PHONE_ON_TOKEN) {
      return NextResponse.json(
        { error: "Phone not verified" },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phone: newPhone });
}
