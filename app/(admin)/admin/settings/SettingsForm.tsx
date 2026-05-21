"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import {
  ADMIN_NOTIFICATION_EVENTS,
  type EventPrefs,
  type AdminNotificationEventKey,
} from "@/lib/notifications/events";
import { extractPhoneDigits, formatUsPhoneDigits } from "@/lib/utils/phone";

export function SettingsForm({
  initialEmail,
  initialPhone,
  initialEvents,
}: {
  initialEmail: string;
  initialPhone: string;
  initialEvents: EventPrefs;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [phoneDigits, setPhoneDigits] = useState(
    extractPhoneDigits(initialPhone),
  );
  const [events, setEvents] = useState<EventPrefs>(initialEvents);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle(key: AdminNotificationEventKey, channel: "email" | "sms") {
    setSaved(false);
    setEvents((prev) => ({
      ...prev,
      [key]: { ...prev[key], [channel]: !prev[key][channel] },
    }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const phone = phoneDigits.length === 10 ? `+1${phoneDigits}` : "";
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), phone, events }),
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Could not save settings");
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save settings");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card variant="elevated">
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-[3px] text-text-faint">
            Where to notify you
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setSaved(false);
                setEmail(e.target.value);
              }}
            />
            <Input
              label="SMS"
              type="tel"
              inputMode="tel"
              placeholder="+1 (555) 123-4567"
              value={phoneDigits ? formatUsPhoneDigits(phoneDigits) : "+1 "}
              onChange={(e) => {
                setSaved(false);
                setPhoneDigits(extractPhoneDigits(e.target.value));
              }}
              hint="Numbers only — formatted automatically. SMS delivery is coming soon."
            />
          </div>
        </div>
      </Card>

      <Card variant="elevated">
        <div className="p-6 flex flex-col gap-4">
          <h2 className="text-xs uppercase tracking-[3px] text-text-faint">
            Notifications
          </h2>
          <div role="table" className="flex flex-col">
            <div
              role="row"
              className="flex items-center gap-4 pb-2 border-b border-brand-line text-xs uppercase tracking-[2px] text-text-faint"
            >
              <span className="flex-1">Event</span>
              <span className="w-14 text-center">Email</span>
              <span className="w-14 text-center">SMS</span>
            </div>
            {ADMIN_NOTIFICATION_EVENTS.map((evt) => (
              <div
                key={evt.key}
                role="row"
                className="flex items-center gap-4 py-3 border-b border-brand-line last:border-0"
              >
                <span className="flex-1 text-sm text-text-primary">
                  {evt.label}
                </span>
                <span className="w-14 flex justify-center">
                  <input
                    type="checkbox"
                    aria-label={`${evt.label} — email`}
                    checked={events[evt.key].email}
                    onChange={() => toggle(evt.key, "email")}
                    className="w-4 h-4 accent-brand-red"
                  />
                </span>
                <span className="w-14 flex justify-center">
                  <input
                    type="checkbox"
                    aria-label={`${evt.label} — SMS`}
                    checked={events[evt.key].sms}
                    onChange={() => toggle(evt.key, "sms")}
                    className="w-4 h-4 accent-brand-red"
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {error && (
        <div
          role="alert"
          className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {saved && !busy && (
          <span className="text-sm text-game-green">Saved.</span>
        )}
      </div>
    </div>
  );
}
