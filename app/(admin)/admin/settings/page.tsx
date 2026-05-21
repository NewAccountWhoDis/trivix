import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { verifySession } from "@/lib/firebase/session";
import { emptyEventPrefs, type EventPrefs } from "@/lib/notifications/events";
import { formatStoredUsPhone } from "@/lib/utils/phone";
import type { AdminChannelPrefs } from "@/types/firestore";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const session = await verifySession();
  if (!session) redirect("/login?next=/admin/settings");

  const snap = await adminDb.collection("adminSettings").doc(session.uid).get();
  const data = snap.data() ?? {};

  // Merge stored prefs over the all-off base so newly-added events appear.
  const storedEvents =
    (data.events as Record<string, AdminChannelPrefs> | undefined) ?? {};
  const events = emptyEventPrefs();
  for (const key of Object.keys(events) as (keyof EventPrefs)[]) {
    const e = storedEvents[key];
    if (e) events[key] = { email: Boolean(e.email), sms: Boolean(e.sms) };
  }

  return (
    <div>
      <h1 className="font-display text-3xl tracking-[3px] mb-2">SETTINGS</h1>
      <p className="text-text-muted mb-6">
        Choose where and how you&apos;re notified about platform activity.
      </p>
      <SettingsForm
        initialEmail={String(data.email ?? "")}
        initialPhone={formatStoredUsPhone(
          (data.phone as string | null) ?? null,
        )}
        initialEvents={events}
      />
    </div>
  );
}
