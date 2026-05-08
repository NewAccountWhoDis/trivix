"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";

const QUAD_LETTERS = [
  { ch: "A", className: "text-game-red", delay: 0 },
  { ch: "B", className: "text-game-blue", delay: 0.6 },
  { ch: "C", className: "text-game-yellow", delay: 1.2 },
  { ch: "D", className: "text-game-green", delay: 1.8 },
] as const;

const MARQUEE = [
  "MOVIES",
  "MUSIC",
  "SPORTS",
  "HISTORY",
  "SCIENCE",
  "POP CULTURE",
  "GEOGRAPHY",
  "FOOD & DRINK",
  "ART",
  "GAMING",
];

export function HomeHero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative min-h-screen overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Backdrop layer — swap this block for a <video> when an asset is ready */}
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-brand-black" />
        <div className="absolute inset-0 bg-grid-floor opacity-30" />
        {!reduce && (
          <>
            <motion.div
              className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(255,31,58,0.35), rgba(255,31,58,0) 70%)",
                filter: "blur(40px)",
              }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <SpotlightSweep />
            <FloatingTiles />
          </>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-black/20 to-brand-black" />
      </div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-text-muted uppercase tracking-[6px] text-xs mb-4"
      >
        Welcome to
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="font-display text-7xl md:text-9xl tracking-[8px] text-text-primary text-center"
        style={{ textShadow: "0 0 32px rgba(255,31,58,0.65)" }}
      >
        TRIVIX
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="mt-6 text-text-muted text-base md:text-lg max-w-xl text-center"
      >
        Trivia, dialed up. Build a team, host a night, and bring the noise.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.6 }}
        className="mt-10 flex flex-wrap justify-center gap-3"
      >
        <Button size="lg" asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button size="lg" variant="secondary" asChild>
          <Link href="/signup?step=1&intent=host">I&rsquo;m a host</Link>
        </Button>
      </motion.div>

      <p className="mt-6 text-text-muted text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-red underline">
          Sign in
        </Link>
      </p>

      <Marquee words={MARQUEE} reduced={Boolean(reduce)} />
    </section>
  );
}

function SpotlightSweep() {
  return (
    <motion.div
      className="absolute inset-0"
      style={{
        background:
          "conic-gradient(from 0deg at 50% 120%, rgba(255,255,255,0) 0deg, rgba(255,31,58,0.18) 30deg, rgba(255,255,255,0) 60deg, rgba(30,167,255,0.12) 180deg, rgba(255,255,255,0) 220deg)",
        mixBlendMode: "screen",
      }}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
    />
  );
}

function FloatingTiles() {
  return (
    <div className="absolute inset-0">
      {QUAD_LETTERS.map((q, i) => (
        <motion.div
          key={q.ch}
          className={`absolute font-display text-5xl md:text-7xl ${q.className}`}
          style={{
            left: `${[10, 82, 18, 78][i]}%`,
            top: `${[22, 30, 70, 65][i]}%`,
            textShadow: "0 0 24px currentColor",
            opacity: 0.55,
          }}
          animate={{ y: [0, -14, 0], rotate: [-3, 3, -3] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: q.delay,
          }}
        >
          {q.ch}
        </motion.div>
      ))}
    </div>
  );
}

function Marquee({ words, reduced }: { words: string[]; reduced: boolean }) {
  const loop = [...words, ...words];
  return (
    <div
      className="absolute bottom-0 left-0 right-0 border-t border-brand-line bg-brand-ink/60 backdrop-blur-sm overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="flex gap-10 py-3 whitespace-nowrap font-display text-sm tracking-[6px] text-text-faint"
        animate={reduced ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        {loop.map((w, i) => (
          <span key={i} className="flex items-center gap-10">
            {w}
            <span className="text-brand-red">●</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
