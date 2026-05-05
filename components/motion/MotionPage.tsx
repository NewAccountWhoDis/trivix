"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { useMotionTier } from "@/hooks/useMotionTier";
import { durations, easings } from "@/lib/motion/tokens";

// Plan 5 will replace this with full GSAP scene wipes.
// Plan 1 ships a tier-aware fade so pages don't slam in.

export function MotionPage({ children }: { children: React.ReactNode }) {
  const tier = useMotionTier();
  if (tier === "off") {
    return <>{children}</>;
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: tier === "full" ? 12 : 0 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: durations.base, ease: easings.standard }}
    >
      {children}
    </motion.div>
  );
}
