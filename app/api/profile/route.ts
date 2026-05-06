import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import {
  profileEditSchema,
  toDisplayNameKey,
} from "@/lib/validation/schemas";

export const runtime = "nodejs";

const ERR_DISPLAY_NAME_TAKEN = "DISPLAY_NAME_TAKEN";

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

  const parsed = profileEditSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { firstName, lastName, displayName } = parsed.data;
  const newKey = toDisplayNameKey(displayName);
  const userRef = adminDb.collection("users").doc(session.uid);
  const newDnRef = adminDb.collection("displayNames").doc(newKey);

  try {
    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new Error("USER_NOT_FOUND");
      }
      const oldKey = String(userSnap.data()?.displayNameKey ?? "");

      if (newKey !== oldKey) {
        const newDnSnap = await tx.get(newDnRef);
        if (newDnSnap.exists) {
          throw new Error(ERR_DISPLAY_NAME_TAKEN);
        }
        if (oldKey) {
          tx.delete(adminDb.collection("displayNames").doc(oldKey));
        }
        tx.set(newDnRef, { uid: session.uid });
      }

      tx.update(userRef, {
        firstName,
        lastName,
        displayName,
        displayNameKey: newKey,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_DISPLAY_NAME_TAKEN) {
      return NextResponse.json(
        { error: "Display name is not available" },
        { status: 409 },
      );
    }
    if (msg === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, displayName });
}
