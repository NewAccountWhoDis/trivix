import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/admin/auth";
import { editHostSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

const ERR_USER_NOT_FOUND = "USER_NOT_FOUND";
const ERR_NEW_MAIN_NOT_FOUND = "NEW_MAIN_NOT_FOUND";
const ERR_NEW_MAIN_NOT_HOST = "NEW_MAIN_NOT_HOST";
const ERR_NEW_MAIN_AT_CAPACITY = "NEW_MAIN_AT_CAPACITY";
const ERR_CAP_BELOW_CURRENT = "CAP_BELOW_CURRENT";

export async function PATCH(
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
  const parsed = editHostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { uid } = await ctx.params;
  const userRef = adminDb.collection("users").doc(uid);

  try {
    await adminDb.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error(ERR_USER_NOT_FOUND);
      const user = userSnap.data() ?? {};
      const wasMain = (user.mainHostUid ?? null) === null;
      const now = FieldValue.serverTimestamp();

      const updates: Record<string, unknown> = { updatedAt: now };

      // Move sub-host to a new main? Or move main → sub?
      if (parsed.data.mainHostUid !== undefined) {
        const newMain = parsed.data.mainHostUid ?? null;
        const oldMain = (user.mainHostUid ?? null) as string | null;

        if (newMain !== oldMain) {
          if (newMain === uid) {
            throw new Error(ERR_NEW_MAIN_NOT_HOST);
          }

          // Detach from old main if any.
          if (oldMain) {
            const oldRef = adminDb.collection("users").doc(oldMain);
            await tx.get(oldRef);
            tx.update(oldRef, {
              subHostUids: FieldValue.arrayRemove(uid),
              updatedAt: now,
            });
          }

          if (newMain) {
            const newRef = adminDb.collection("users").doc(newMain);
            const newSnap = await tx.get(newRef);
            if (!newSnap.exists) throw new Error(ERR_NEW_MAIN_NOT_FOUND);
            const newData = newSnap.data() ?? {};
            if (
              newData.role !== "host" ||
              newData.hostStatus !== "approved" ||
              (newData.mainHostUid ?? null) !== null
            ) {
              throw new Error(ERR_NEW_MAIN_NOT_HOST);
            }
            const subs = (newData.subHostUids as string[] | undefined) ?? [];
            const cap = Number(newData.subHostCap ?? 0);
            if (subs.length >= cap) throw new Error(ERR_NEW_MAIN_AT_CAPACITY);
            tx.update(newRef, {
              subHostUids: FieldValue.arrayUnion(uid),
              updatedAt: now,
            });
          }

          updates.mainHostUid = newMain;

          // Moving main → sub clears their main-only fields, and we need to
          // demote any existing sub-hosts back to players.
          if (wasMain && newMain) {
            const subUids =
              (user.subHostUids as string[] | undefined) ?? [];
            await Promise.all(
              subUids.map(async (s) => {
                const ref = adminDb.collection("users").doc(s);
                await tx.get(ref);
                tx.update(ref, {
                  hostStatus: "denied",
                  mainHostUid: null,
                  updatedAt: now,
                });
              }),
            );
            updates.hostExpiresAt = null;
            updates.subHostCap = 0;
            updates.subHostUids = [];
          }
        }
      }

      if (parsed.data.hostExpiresAt !== undefined) {
        const v = parsed.data.hostExpiresAt;
        updates.hostExpiresAt = v
          ? Timestamp.fromDate(new Date(`${v}T23:59:59`))
          : null;
      }

      if (parsed.data.subHostCap !== undefined) {
        const newCap = parsed.data.subHostCap;
        const currentSubs =
          (user.subHostUids as string[] | undefined) ?? [];
        if (newCap < currentSubs.length) {
          throw new Error(ERR_CAP_BELOW_CURRENT);
        }
        updates.subHostCap = newCap;
      }

      tx.update(userRef, updates);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_USER_NOT_FOUND) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (msg === ERR_NEW_MAIN_NOT_FOUND) {
      return NextResponse.json(
        { error: "Main host not found" },
        { status: 404 },
      );
    }
    if (msg === ERR_NEW_MAIN_NOT_HOST) {
      return NextResponse.json(
        { error: "Selected account is not an approved main host" },
        { status: 400 },
      );
    }
    if (msg === ERR_NEW_MAIN_AT_CAPACITY) {
      return NextResponse.json(
        { error: "Main host has no available sub-host slots" },
        { status: 409 },
      );
    }
    if (msg === ERR_CAP_BELOW_CURRENT) {
      return NextResponse.json(
        {
          error:
            "Cap can't be lower than the current number of sub-hosts. Remove some sub-hosts first.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
