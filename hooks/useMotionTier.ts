"use client";
import { useEffect, useState } from "react";
import { detectMotionTier, type MotionTier } from "@/lib/motion/tier";

export function useMotionTier(): MotionTier {
  const [tier, setTier] = useState<MotionTier>("off"); // SSR-safe default

  useEffect(() => {
    let cancelled = false;
    detectMotionTier().then((t) => {
      if (!cancelled) setTier(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return tier;
}
