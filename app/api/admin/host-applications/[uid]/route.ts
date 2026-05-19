import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { hostApplicationActionSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const ERR_APP_NOT_FOUND = "APP_NOT_FOUND";
const ERR_USER_NOT_FOUND = "USER_NOT_FOUND";
const ERR_MAIN_NOT_FOUND = "MAIN_NOT_FOUND";
const ERR_MAIN_NOT_HOST = "MAIN_NOT_HOST";
const ERR_MAIN_AT_CAPACITY = "MAIN_AT_CAPACITY";

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
    return NextResponse.json(
      { error: "Invalid action", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { uid } = await ctx.params;
  const appRef = adminDb.collection("hostApplications").doc(uid);
  const userRef = adminDb.collection("users").doc(uid);
  const newStatus = parsed.data.action === "approve" ? "approved" : "denied";
  const mainHostUid = parsed.data.mainHostUid ?? null;

  try {
    await adminDb.runTransaction(async (tx) => {
      const appSnap = await tx.get(appRef);
      if (!appSnap.exists) throw new Error(ERR_APP_NOT_FOUND);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error(ERR_USER_NOT_FOUND);

      const now = FieldValue.serverTimestamp();

      if (parsed.data.action === "deny") {
        tx.update(appRef, {
          status: newStatus,
          decidedAt: now,
          decidedBy: auth.uid,
        });
        tx.update(userRef, {
          hostStatus: newStatus,
          updatedAt: now,
        });
        return;
      }

      if (mainHostUid) {
        if (mainHostUid === uid) throw new Error(ERR_MAIN_NOT_HOST);
        const mainRef = adminDb.collection("users").doc(mainHostUid);
        const mainSnap = await tx.get(mainRef);
        if (!mainSnap.exists) throw new Error(ERR_MAIN_NOT_FOUND);
        const main = mainSnap.data() ?? {};
        if (
          main.role !== "host" ||
          main.hostStatus !== "approved" ||
          (main.mainHostUid ?? null) !== null
        ) {
          throw new Error(ERR_MAIN_NOT_HOST);
        }
        const subs = (main.subHostUids as string[] | undefined) ?? [];
        const cap = Number(main.subHostCap ?? 0);
        if (subs.length >= cap) throw new Error(ERR_MAIN_AT_CAPACITY);
        if (!subs.includes(uid)) {
          tx.update(mainRef, {
            subHostUids: FieldValue.arrayUnion(uid),
            updatedAt: now,
          });
        }
        tx.update(appRef, {
          status: newStatus,
          decidedAt: now,
          decidedBy: auth.uid,
        });
        tx.update(userRef, {
          role: "host",
          hostStatus: newStatus,
          mainHostUid,
          hostExpiresAt: null,
          subHostCap: 0,
          subHostUids: [],
          updatedAt: now,
        });
        return;
      }

      const expiresIso = parsed.data.hostExpiresAt;
      const cap = parsed.data.subHostCap ?? 0;
      const expiresTs = expiresIso
        ? Timestamp.fromDate(new Date(`${expiresIso}T23:59:59`))
        : null;

      tx.update(appRef, {
        status: newStatus,
        decidedAt: now,
        decidedBy: auth.uid,
      });
      tx.update(userRef, {
        role: "host",
        hostStatus: newStatus,
        mainHostUid: null,
        hostExpiresAt: expiresTs,
        subHostCap: cap,
        subHostUids: [],
        updatedAt: now,
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_APP_NOT_FOUND) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    if (msg === ERR_USER_NOT_FOUND) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (msg === ERR_MAIN_NOT_FOUND) {
      return NextResponse.json(
        { error: "Main host not found" },
        { status: 404 },
      );
    }
    if (msg === ERR_MAIN_NOT_HOST) {
      return NextResponse.json(
        { error: "Selected account is not an approved main host" },
        { status: 400 },
      );
    }
    if (msg === ERR_MAIN_AT_CAPACITY) {
      return NextResponse.json(
        { error: "Main host has no available sub-host slots" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
