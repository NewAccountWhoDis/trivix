"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import type { SerializedUser } from "@/types/firestore";

export function HostAccessButton({
  hostStatus,
}: {
  hostStatus: SerializedUser["hostStatus"];
}) {
  if (hostStatus === "approved") return null;

  if (hostStatus === "pending") {
    return (
      <Button variant="secondary" disabled>
        Host · pending
      </Button>
    );
  }

  return (
    <Button asChild>
      <Link href="/host-application">Host — Request Access</Link>
    </Button>
  );
}
