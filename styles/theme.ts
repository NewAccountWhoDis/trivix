// styles/theme.ts
// Single source of truth for theme tokens. Tailwind config reads from here.
// Components should never hardcode hex values.

export const colors = {
  // Brand surface
  "brand-black": "#050608",
  "brand-ink": "#0d0e12",
  "brand-line": "#1a1c22",
  // Brand hero
  "brand-red": "#ff1f3a",
  "brand-red-glow": "#ff3855",
  // Gameplay quad (used for answer buttons / categories in later plans)
  "game-red": "#ff2e3e",
  "game-blue": "#1ea7ff",
  "game-yellow": "#ffd400",
  "game-green": "#1fd66a",
  // Text
  "text-primary": "#ffffff",
  "text-muted": "rgba(255,255,255,0.62)",
  "text-faint": "rgba(255,255,255,0.38)",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  full: "9999px",
} as const;

export const shadow = {
  soft: "0 8px 24px rgba(0,0,0,0.35)",
  "glow-red": "0 0 24px rgba(255,31,58,0.55)",
  "glow-quad-r": "0 0 24px rgba(255,46,62,0.55)",
  "glow-quad-b": "0 0 24px rgba(30,167,255,0.55)",
  "glow-quad-y": "0 0 24px rgba(255,212,0,0.55)",
  "glow-quad-g": "0 0 24px rgba(31,214,106,0.55)",
} as const;

export const fontFamily = {
  display: ["var(--font-anton)", "Impact", "system-ui", "sans-serif"],
  body: ["var(--font-inter)", "system-ui", "sans-serif"],
  mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
} as const;

export const theme = { colors, radius, shadow, fontFamily } as const;
export type ThemeColorKey = keyof typeof colors;
