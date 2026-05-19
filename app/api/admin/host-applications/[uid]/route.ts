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

export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ uid: string }> },
): Promise<NextResponse> {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { uid } = await ctx.params;
  const appRef = adminDb.collection("hostApplications").doc(uid);
  const userRef = adminDb.collection("users").doc(uid);

  try {
    await adminDb.runTransaction(async (tx) => {
      const appSnap = await tx.get(appRef);
      const userSnap = await tx.get(userRef);
      if (!appSnap.exists && !userSnap.exists) {
        throw new Error("NOT_FOUND");
      }

      const now = FieldValue.serverTimestamp();

      // Orphan application (user doc was already deleted) — just nuke the app.
      if (!userSnap.exists) {
        if (appSnap.exists) tx.delete(appRef);
        return;
      }

      const u = userSnap.data() ?? {};

      // If this user is currently a sub-host, detach from their main.
      const mainUid = (u.mainHostUid ?? null) as string | null;
      if (mainUid) {
        const mainRef = adminDb.collection("users").doc(mainUid);
        await tx.get(mainRef);
        tx.update(mainRef, {
          subHostUids: FieldValue.arrayRemove(uid),
          updatedAt: now,
        });
      }

      // If this user is a main host with sub-hosts, demote the subs too.
      const subUids = (u.subHostUids as string[] | undefined) ?? [];
      for (const s of subUids) {
        const ref = adminDb.collection("users").doc(s);
        await tx.get(ref);
        tx.update(ref, {
          role: "player",
          hostStatus: "none",
          mainHostUid: null,
          updatedAt: now,
        });
      }

      if (appSnap.exists) tx.delete(appRef);
      tx.update(userRef, {
        role: "player",
        hostStatus: "none",
        mainHostUid: null,
        hostExpiresAt: null,
        subHostCap: 0,
        subHostUids: [],
        updatedAt: now,
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
