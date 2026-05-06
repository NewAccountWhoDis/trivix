import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen grid md:grid-cols-2 bg-brand-black text-text-primary">
      <section className="flex flex-col px-6 py-10 md:px-12 md:py-14">
        <Link
          href="/"
          className="font-display text-2xl tracking-[4px] mb-10 hover:opacity-80 transition-opacity"
        >
          TRIVIX
        </Link>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </section>

      <aside className="hidden md:flex relative items-center justify-center overflow-hidden bg-brand-ink border-l border-brand-line">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(circle at center, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 75%)",
          }}
          aria-hidden="true"
        />
        <div className="relative text-center px-12">
          <p className="text-text-faint uppercase tracking-[6px] text-xs mb-6">
            Trivia, dialed up
          </p>
          <h2
            className="font-display text-7xl tracking-[8px]"
            style={{ textShadow: "0 0 24px rgba(255,31,58,0.55)" }}
          >
            TRIVIX
          </h2>
          <p className="mt-6 text-text-muted max-w-xs mx-auto">
            Build a team, host a night, and bring the noise.
          </p>
        </div>
      </aside>
    </main>
  );
}
