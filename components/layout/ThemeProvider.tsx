"use client";
import * as React from "react";
import { useMotionTier } from "@/hooks/useMotionTier";
import type { MotionTier } from "@/lib/motion/tier";

interface ThemeContextValue {
  motionTier: MotionTier;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  motionTier: "off",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const motionTier = useMotionTier();
  const value = React.useMemo(() => ({ motionTier }), [motionTier]);
  return (
    <ThemeContext.Provider value={value}>
      <div data-motion-tier={motionTier}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  return React.useContext(ThemeContext);
}
