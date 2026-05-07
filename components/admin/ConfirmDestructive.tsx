"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";

interface Props {
  trigger: ReactNode;
  title: string;
  description: string;
  /** Phrase the user must type to confirm. Case-insensitive. */
  confirmPhrase: string;
  /** Label for the danger button. */
  actionLabel?: string;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDestructive({
  trigger,
  title,
  description,
  confirmPhrase,
  actionLabel = "Confirm",
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = typed.trim().toLowerCase() === confirmPhrase.toLowerCase();

  function reset() {
    setTyped("");
    setError(null);
    setBusy(false);
  }

  async function handleConfirm() {
    if (!matches) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
      setBusy(false);
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
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,28rem)] bg-brand-ink border border-brand-line rounded-lg p-6 shadow-soft">
          <Dialog.Title className="font-display text-2xl tracking-[3px] mb-2">
            {title}
          </Dialog.Title>
          <Dialog.Description className="text-text-muted text-sm mb-5">
            {description}
          </Dialog.Description>
          <div className="mb-2 text-xs uppercase tracking-[3px] text-text-faint">
            Type{" "}
            <span className="font-mono text-text-primary">{confirmPhrase}</span>{" "}
            to confirm
          </div>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmPhrase}
            autoFocus
          />
          {error && (
            <div
              role="alert"
              className="mt-3 text-sm text-game-red bg-game-red/10 border border-game-red/30 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}
          <div className="flex gap-3 mt-5 justify-end">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="danger"
              disabled={!matches || busy}
              onClick={handleConfirm}
            >
              {busy ? "Working…" : actionLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
