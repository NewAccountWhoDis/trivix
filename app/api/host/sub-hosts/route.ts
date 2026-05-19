import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { addSubHostSchema } from "@/lib/validation/schemas";
import { checkAndExpireHost } from "@/lib/host/expiration";

export const runtime = "nodejs";

const ERR_NOT_HOST = "NOT_HOST";
const ERR_AT_CAPACITY = "AT_CAPACITY";
const ERR_TARGET_NOT_FOUND = "TARGET_NOT_FOUND";
const ERR_TARGET_INELIGIBLE = "TARGET_INELIGIBLE";
const ERR_SELF = "SELF";

export async function POST(request: Request): Promise<NextResponse> {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  await checkAndExpireHost(session.uid);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = addSubHostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields" }, { status: 400 });
  }
  const targetUid = parsed.data.uid;

  const callerRef = adminDb.collection("users").doc(session.uid);
  const targetRef = adminDb.collection("users").doc(targetUid);

  try {
    await adminDb.runTransaction(async (tx) => {
      const callerSnap = await tx.get(callerRef);
      const targetSnap = await tx.get(targetRef);
      if (!callerSnap.exists) throw new Error(ERR_NOT_HOST);
      const caller = callerSnap.data() ?? {};
      if (
        caller.role !== "host" ||
        caller.hostStatus !== "approved" ||
        (caller.mainHostUid ?? null) !== null
      ) {
        throw new Error(ERR_NOT_HOST);
      }
      if (targetUid === session.uid) throw new Error(ERR_SELF);
      if (!targetSnap.exists) throw new Error(ERR_TARGET_NOT_FOUND);
      const target = targetSnap.data() ?? {};
      // Target must not already be an active host elsewhere.
      const targetIsActiveHost =
        target.role === "host" && target.hostStatus === "approved";
      if (targetIsActiveHost) throw new Error(ERR_TARGET_INELIGIBLE);

      const subs = (caller.subHostUids as string[] | undefined) ?? [];
      const cap = Number(caller.subHostCap ?? 0);
      if (subs.length >= cap) throw new Error(ERR_AT_CAPACITY);
      if (subs.includes(targetUid)) return; // idempotent

      const now = FieldValue.serverTimestamp();
      tx.update(callerRef, {
        subHostUids: FieldValue.arrayUnion(targetUid),
        updatedAt: now,
      });
      tx.update(targetRef, {
        role: "host",
        hostStatus: "approved",
        mainHostUid: session.uid,
        hostExpiresAt: null,
        subHostCap: 0,
        subHostUids: [],
        updatedAt: now,
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_NOT_HOST) {
      return NextResponse.json(
        { error: "Only an approved main host can add sub-hosts." },
        { status: 403 },
      );
    }
    if (msg === ERR_SELF) {
      return NextResponse.json(
        { error: "You can't add yourself." },
        { status: 400 },
      );
    }
    if (msg === ERR_TARGET_NOT_FOUND) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (msg === ERR_TARGET_INELIGIBLE) {
      return NextResponse.json(
        { error: "That user is already an active host." },
        { status: 409 },
      );
    }
    if (msg === ERR_AT_CAPACITY) {
      return NextResponse.json(
        { error: "You are at your sub-host limit." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Add failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
