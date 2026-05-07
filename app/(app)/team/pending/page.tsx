"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { Button } from "@/components/ui";
import { Card } from "@/components/ui/Card";
import { useUser } from "@/hooks/useUser";

export default function TeamPendingPage() {
  const router = useRouter();
  const user = useUser();
  const [status, setStatus] = useState<"waiting" | "joined">("waiting");

  useEffect(() => {
    const ref = doc(firebaseDb, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      const teamId = snap.data()?.teamId as string | null | undefined;
      if (teamId) {
        setStatus("joined");
        router.replace("/team");
      }
    });
    return () => unsub();
  }, [user.uid, router]);

  return (
    <main className="min-h-screen px-6 py-10 md:px-12 md:py-14 max-w-xl mx-auto">
      <h1 className="font-display text-4xl tracking-[3px] mb-2">
        REQUEST SENT
      </h1>
      <p className="text-text-muted mb-8">
        Your captain just got pinged. We&apos;ll move you to the team page as
        soon as they approve.
      </p>

      <Card>
        <div className="p-6 flex items-center gap-4">
          <div className="relative w-3 h-3">
            <span className="absolute inset-0 rounded-full bg-brand-red animate-ping" />
            <span className="absolute inset-0 rounded-full bg-brand-red" />
          </div>
          <div>
            <div className="text-text-primary">
              {status === "waiting" ? "Waiting for approval…" : "You're in!"}
            </div>
            <div className="text-xs text-text-faint mt-1">
              This page updates in real time.
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-8 flex gap-3">
        <Button variant="ghost" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
