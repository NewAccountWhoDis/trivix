import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <p className="text-text-muted uppercase tracking-[6px] text-xs mb-4">
        Welcome to
      </p>
      <h1
        className="font-display text-7xl md:text-9xl tracking-[8px] text-text-primary"
        style={{ textShadow: "0 0 24px rgba(255,31,58,0.55)" }}
      >
        TRIVIX
      </h1>
      <p className="mt-6 text-text-muted text-base md:text-lg max-w-xl text-center">
        Trivia, dialed up. Build a team, host a night, and bring the noise.
      </p>
      <div className="mt-10 flex gap-3">
        <Button size="lg" asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/signup?step=1&intent=host">I&rsquo;m a host</Link>
        </Button>
      </div>
      <p className="mt-6 text-text-muted text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-red underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
