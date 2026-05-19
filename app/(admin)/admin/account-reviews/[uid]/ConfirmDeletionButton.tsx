"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { ConfirmDestructive } from "@/components/admin/ConfirmDestructive";

export function ConfirmDeletionButton({
  uid,
  displayName,
}: {
  uid: string;
  displayName: string;
}) {
  const router = useRouter();

  async function handleConfirm() {
    const res = await fetch(`/api/admin/account-reviews/${uid}/confirm`, {
      method: "POST",
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error ?? "Confirm failed");
    }
    router.push("/admin/account-reviews");
    router.refresh();
  }

  return (
    <ConfirmDestructive
      trigger={
        <Button variant="danger" size="lg">
          Confirm account has been deleted
        </Button>
      }
      title="Confirm deletion"
      description={`Mark @${displayName} as archived. Make sure you've deleted the Firebase Auth user manually in the Firebase console.`}
      confirmPhrase={`@${displayName}`}
      actionLabel="Confirm deletion"
      onConfirm={handleConfirm}
    />
  );
}
