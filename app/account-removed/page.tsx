"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { signOutClient } from "@/lib/auth/client";

export default function AccountRemovedPage() {
  const router = useRouter();

  // Drop the session cookie + Firebase client state so the next /login
  // attempt is clean.
  useEffect(() => {
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    void signOutClient().catch(() => {});
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="font-display text-4xl tracking-[3px] mb-4">
          ACCOUNT REMOVED
        </h1>
        <p className="text-text-muted mb-8">
          Your account is being removed. Check back soon to create a new
          account, or create one now with different information.
        </p>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            onClick={() => {
              router.push("/signup");
            }}
          >
            Create a new account
          </Button>
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-text-primary transition"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
