import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import {
  completeSignupSchema,
  toDisplayNameKey,
} from "@/lib/validation/schemas";
import { DEFAULT_USER_STATS } from "@/types/firestore";

export const runtime = "nodejs";

const ERR_DISPLAY_NAME_TAKEN = "DISPLAY_NAME_TAKEN";
const ERR_ALREADY_SIGNED_UP = "ALREADY_SIGNED_UP";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { idToken, ...rest } = body as { idToken?: unknown } & Record<
    string,
    unknown
  >;

  if (typeof idToken !== "string" || idToken.length === 0) {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid idToken" }, { status: 401 });
  }

  const parsed = completeSignupSchema.safeParse(rest);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { firstName, lastName, displayName, role, reason } = parsed.data;
  const displayNameKey = toDisplayNameKey(displayName);
  const uid = decoded.uid;
  const email = decoded.email ?? "";
  const emailVerified = Boolean(decoded.email_verified);
  const phone = (decoded.phone_number as string | undefined) ?? null;
  const phoneVerified =
    decoded.firebase?.sign_in_provider === "phone" || Boolean(phone);

  const userRef = adminDb.collection("users").doc(uid);
  const dnRef = adminDb.collection("displayNames").doc(displayNameKey);
  const hostAppRef =
    role === "host" ? adminDb.collection("hostApplications").doc(uid) : null;

  const now = FieldValue.serverTimestamp();

  try {
    await adminDb.runTransaction(async (tx) => {
      const [userSnap, dnSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(dnRef),
      ]);

      if (userSnap.exists) {
        throw new Error(ERR_ALREADY_SIGNED_UP);
      }
      if (dnSnap.exists) {
        throw new Error(ERR_DISPLAY_NAME_TAKEN);
      }

      tx.set(userRef, {
        uid,
        email,
        emailVerified,
        phone,
        phoneVerified,
        firstName,
        lastName,
        displayName,
        displayNameKey,
        avatarSeed: uid,
        role,
        hostStatus: role === "host" ? "pending" : "none",
        isAdmin: false,
        teamId: null,
        teamHistory: [],
        stats: DEFAULT_USER_STATS,
        createdAt: now,
        updatedAt: now,
      });

      tx.set(dnRef, { uid });

      if (hostAppRef) {
        tx.set(hostAppRef, {
          uid,
          email,
          displayName,
          reason: reason ?? null,
          status: "pending",
          appliedAt: now,
          decidedAt: null,
          decidedBy: null,
        });
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === ERR_DISPLAY_NAME_TAKEN) {
      return NextResponse.json(
        { error: "Display name is not available" },
        { status: 409 },
      );
    }
    if (msg === ERR_ALREADY_SIGNED_UP) {
      return NextResponse.json(
        { error: "Account already completed signup" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, uid, displayName });
}
