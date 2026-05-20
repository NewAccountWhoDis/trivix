"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";

const REASONS = [
  "Account update",
  "General app questions",
  "Host application",
  "Report an issue",
  "Other",
] as const;

interface Props {
  trigger: ReactNode;
  /** Pre-select a reason when opened from a specific context. */
  defaultReason?: (typeof REASONS)[number];
}

export function ContactSupportModal({ trigger, defaultReason }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(defaultReason ?? REASONS[0]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setReason(defaultReason ?? REASONS[0]);
    setName("");
    setContact("");
    setPhone("");
    setMessage("");
    setSubmitting(false);
    setSubmitted(false);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = new URLSearchParams();
      body.append("form-name", "contact-support");
      body.append("bot-field", "");
      body.append("reason", reason);
      body.append("name", name);
      body.append("contact", contact);
      body.append("phone", phone);
      body.append("message", message);

      const res = await fetch("/__forms.html", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error("Couldn't send your message. Try again.");
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't send your message.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-brand-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,32rem)] max-h-[90vh] overflow-y-auto bg-brand-ink border border-brand-line rounded-lg p-6 shadow-soft">
          <Dialog.Title className="font-display text-2xl tracking-[3px] mb-1">
            CONTACT SUPPORT
          </Dialog.Title>

          {submitted ? (
            <div className="py-6">
              <Dialog.Description className="text-text-primary text-base">
                Thank you for reaching out. We will follow up as soon as
                possible.
              </Dialog.Description>
              <div className="flex justify-end mt-6">
                <Dialog.Close asChild>
                  <Button>Close</Button>
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <>
              <Dialog.Description className="text-text-muted text-sm mb-5">
                Send us a message and we&rsquo;ll get back to you.
              </Dialog.Description>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text-muted">
                    Reason for contact
                  </span>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="h-11 px-4 rounded-md bg-brand-ink border border-brand-line text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition"
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>

                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email/Username"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
                <Input
                  label="Phone (optional)"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-text-muted">
                    Message
                  </span>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    required
                    maxLength={2000}
                    className="px-4 py-3 rounded-md bg-brand-ink border border-brand-line text-text-primary placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red transition resize-none"
                    placeholder="How can we help?"
                  />
                </label>

                {error && (
                  <div
                    role="alert"
                    className="text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
                  >
                    {error}
                  </div>
                )}

                <div className="flex gap-3 justify-end mt-1">
                  <Dialog.Close asChild>
                    <Button type="button" variant="ghost" disabled={submitting}>
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending…" : "Submit"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
