"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";

export function DeletionRequestButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/deletion-request", {
        method: "POST",
      });
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(b.error ?? "Request failed");
      }
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="danger">Request account deletion</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-brand-black/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,26rem)] bg-brand-ink border border-brand-line rounded-lg p-6 shadow-soft">
          <Dialog.Title className="font-display text-2xl tracking-[3px] mb-2">
            ARE YOU SURE?
          </Dialog.Title>
          <Dialog.Description className="text-text-muted text-sm mb-5">
            We&apos;ll send a deletion request to an admin. You&apos;ll keep
            using the app until they finalize it.
          </Dialog.Description>
          {error && (
            <div
              role="alert"
              className="mb-3 text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                No
              </Button>
            </Dialog.Close>
            <Button
              variant="danger"
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy ? "Sending…" : "Yes, request"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
