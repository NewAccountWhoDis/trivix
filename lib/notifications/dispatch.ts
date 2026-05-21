import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { sendEmail } from "./email";
import type { AdminNotificationEventKey } from "@/types/firestore";

/**
 * Notify every admin who has subscribed to `event` via their configured
 * channel. Email is delivered via Resend; SMS is stored as a preference but
 * not yet wired to a provider (v1). Admins are a tiny set, so we read all
 * settings docs and filter in memory — no index needed.
 *
 * Always safe to await from a trigger route: it swallows its own errors so a
 * delivery failure never breaks the user action that fired it.
 */
export async function notifyAdmins(
  event: AdminNotificationEventKey,
  opts: { subject: string; body: string },
): Promise<void> {
  try {
    const snap = await adminDb.collection("adminSettings").get();
    const sends: Promise<void>[] = [];
    for (const doc of snap.docs) {
      const data = doc.data();
      const prefs = (data.events as Record<string, { email?: boolean; sms?: boolean }> | undefined)?.[
        event
      ];
      if (!prefs) continue;
      const email = data.email as string | null | undefined;
      if (prefs.email && email) {
        sends.push(sendEmail({ to: email, subject: opts.subject, text: opts.body }));
      }
      // SMS (prefs.sms) is intentionally not delivered yet — no provider wired.
    }
    await Promise.allSettled(sends);
  } catch (err) {
    console.error("[notifications] dispatch failed for", event, err);
  }
}
