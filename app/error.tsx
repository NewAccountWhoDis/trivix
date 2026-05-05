"use client";
import * as React from "react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-5xl tracking-widest mb-4">
        Buzzer broke.
      </h1>
      <p className="text-text-muted mb-8">
        {error.message || "Something unexpected happened."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
