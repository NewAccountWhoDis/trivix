# Plan 1 — Foundation & Theming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a deployable Next.js 15 + TypeScript + Tailwind + Firebase project on Netlify with the Trivix theme tokens, fonts, base UI primitives, motion-tier detection, motion tokens, ambient R3F canvas slot, Firebase Emulator Suite wiring, and a full CI pipeline (Vitest + Playwright + axe + Lighthouse). Result: a themed landing page renders locally and in production, all CI checks pass green, and downstream plans (auth, teams, admin, motion polish) can build on this scaffold without re-litigating infrastructure.

**Architecture:** Next.js App Router single repo. Theme is centralized in `styles/theme.ts` and consumed by Tailwind via the `theme.extend` config (no hex literals in components). Firebase is split into a `client.ts` (browser SDK) and a `server-only` `admin.ts` (Admin SDK) so the Admin SDK can never leak to the client bundle. The motion system has three runtime tiers (`full` / `light` / `off`) chosen once per session by `useMotionTier()`. R3F is dynamic-imported so it never lives in the critical path. Tests run against the Firebase Emulator Suite both locally and in CI.

**Tech Stack:** Next.js 15.x (App Router) · TypeScript 5 · Tailwind CSS 3 · React 19 · Firebase 11 (Auth + Firestore + Admin SDK + Emulator Suite) · Framer Motion · GSAP · Lottie React · React Three Fiber + drei (lazy) · Radix UI · Zod · React Hook Form · Vitest · @testing-library/react · Playwright · @axe-core/playwright · Lighthouse CI · Netlify Next.js plugin.

---

## File Structure

Files this plan creates (no modifications — fresh repo on top of an empty `main` branch with the spec already committed):

**Project root**

- `package.json` — npm scripts, dependencies
- `tsconfig.json` — strict TS, path alias `@/*` → `./`
- `next.config.mjs` — Next config, image domains, headers
- `tailwind.config.ts` — consumes tokens from `styles/theme.ts`
- `postcss.config.js` — Tailwind + autoprefixer
- `.eslintrc.json` — Next.js + import sort
- `.prettierrc` — formatting
- `vitest.config.ts` — unit + integration runner
- `playwright.config.ts` — E2E config; spawns Next dev + Firebase emulators
- `lighthouserc.json` — Lighthouse CI thresholds (soft-fail)
- `firebase.json` — Hosting (none), Firestore, Auth, Storage emulator config
- `.firebaserc` — project alias
- `firestore.rules` — baseline rules (default-deny; updated in later plans)
- `firestore.indexes.json` — empty array placeholder
- `netlify.toml` — Next.js plugin config, build command, env mapping
- `.env.example` — documents required env vars
- `.env.local` — local dev values (gitignored already)
- `README.md` — quickstart for next engineer

**App**

- `app/layout.tsx` — root layout; loads fonts, theme provider, mounts R3F canvas slot
- `app/page.tsx` — themed landing page
- `app/globals.css` — Tailwind base + CSS reset + font face declarations
- `app/error.tsx` — themed error boundary
- `app/not-found.tsx` — themed 404
- `app/api/health/route.ts` — `{ ok: true }` for smoke tests

**Styles**

- `styles/theme.ts` — color, radius, shadow, font, motion tokens (single source of truth)
- `styles/fonts.ts` — Next/Font instances for Anton, Inter, JetBrains Mono

**lib**

- `lib/firebase/client.ts` — initializes Firebase client SDK; connects to emulators when `NEXT_PUBLIC_USE_EMULATORS=true`
- `lib/firebase/admin.ts` — initializes Firebase Admin SDK; `import "server-only"`
- `lib/firebase/session.ts` — session cookie create/verify helpers (skeleton; full auth lands in Plan 2)
- `lib/motion/tokens.ts` — durations, easings, springs, stagger constants
- `lib/motion/tier.ts` — `detectMotionTier()` pure function
- `lib/motion/reduced-motion.ts` — `prefersReducedMotion()` helper
- `lib/avatar/seed.ts` — `seedToGradient(seed: string)` deterministic gradient picker
- `lib/utils/cn.ts` — `clsx` + `tailwind-merge` helper

**hooks**

- `hooks/useMotionTier.ts` — React hook around `detectMotionTier()`
- `hooks/useReducedMotion.ts` — React hook around media query
- `hooks/useTheme.ts` — exposes theme tokens to components (rare; mostly Tailwind handles theming)

**components**

- `components/ui/Button.tsx`
- `components/ui/Input.tsx`
- `components/ui/Card.tsx`
- `components/ui/Avatar.tsx`
- `components/ui/Badge.tsx`
- `components/ui/Toast.tsx` + `components/ui/ToastProvider.tsx`
- `components/ui/index.ts` — re-exports for convenience
- `components/three/BrandScene.tsx` — root R3F canvas, dynamic-imported
- `components/three/GridFloor.tsx` — animated perspective grid (full tier)
- `components/three/StaticGridFloor.tsx` — SVG fallback (light/off tier)
- `components/motion/MotionPage.tsx` — page transition wrapper (skeleton; full GSAP wipes land in Plan 5)
- `components/layout/ThemeProvider.tsx` — provides motion tier + theme to subtree

**types**

- `types/firestore.ts` — empty placeholder (populated in Plan 2)

**tests**

- `tests/unit/motion/tier.test.ts`
- `tests/unit/motion/reduced-motion.test.ts`
- `tests/unit/avatar/seed.test.ts`
- `tests/unit/utils/cn.test.ts`
- `tests/integration/firebase/emulator-smoke.test.ts`
- `tests/e2e/landing.spec.ts`
- `tests/e2e/health.spec.ts`
- `tests/e2e/axe.spec.ts`
- `tests/setup/vitest-setup.ts`
- `tests/setup/emulator-bootstrap.ts`
- `tests/fixtures/seed.ts` — placeholder; populated in Plan 2

**.github**

- `.github/workflows/ci.yml` — lint + typecheck + unit + integration + build + E2E + Lighthouse

**public**

- `public/favicon.ico` — placeholder (Trivix mark TBD in Plan 5; for now use a generic black square)
- `public/og.png` — open-graph placeholder

---

## Task Index

1. Initialize the Next.js project with strict TypeScript and Tailwind
2. Install runtime + dev dependencies in two grouped commands
3. Add `tsconfig` path alias and base TS config
4. Author `styles/theme.ts` (color, radius, shadow, motion tokens)
5. Wire `tailwind.config.ts` to read from `styles/theme.ts`
6. Configure fonts via `next/font` and `app/globals.css`
7. Author `lib/utils/cn.ts` with TDD
8. Author `lib/motion/tokens.ts`
9. Author `lib/motion/reduced-motion.ts` with TDD
10. Author `lib/motion/tier.ts` with TDD
11. Author `hooks/useReducedMotion.ts` and `hooks/useMotionTier.ts`
12. Author `lib/avatar/seed.ts` with TDD
13. Author `components/ui/Button.tsx`
14. Author `components/ui/Input.tsx`
15. Author `components/ui/Card.tsx`
16. Author `components/ui/Avatar.tsx` (renders auto-initials tile)
17. Author `components/ui/Badge.tsx`
18. Author `components/ui/Toast.tsx` + `ToastProvider.tsx`
19. Author `components/ui/index.ts` barrel
20. Author `components/layout/ThemeProvider.tsx`
21. Author `components/three/StaticGridFloor.tsx` (SVG fallback)
22. Author `components/three/GridFloor.tsx` and `components/three/BrandScene.tsx` with dynamic import
23. Author `components/motion/MotionPage.tsx` skeleton
24. Author `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/error.tsx`, `app/not-found.tsx`
25. Author `app/api/health/route.ts`
26. Author `lib/firebase/client.ts`, `lib/firebase/admin.ts`, `lib/firebase/session.ts` (skeletons)
27. Configure Firebase Emulator Suite (`firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, env)
28. Author Vitest config + setup + emulator bootstrap + emulator smoke test
29. Author Playwright config + landing/health/axe E2E specs
30. Author Lighthouse CI config
31. Author `.github/workflows/ci.yml`
32. Author `netlify.toml` and Netlify deploy verification
33. Author `README.md` quickstart
34. Final verification pass

---

## Task 1: Initialize the Next.js project with strict TypeScript and Tailwind

**Files:**

- Create: `package.json` (via scaffolder)
- Create: `tsconfig.json` (via scaffolder)
- Create: `next.config.mjs` (via scaffolder)
- Create: `tailwind.config.ts` (via scaffolder; will be replaced in Task 5)
- Create: `postcss.config.js` (via scaffolder)
- Create: `.eslintrc.json` (via scaffolder)
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css` (via scaffolder; will be replaced)
- Create: `next-env.d.ts`

- [ ] **Step 1: Run the Next.js scaffolder (non-interactive flags)**

```bash
cd "/Users/macblack/Downloads/Web Dev/Trivix"
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*" \
  --use-npm \
  --no-turbopack
```

Expected: scaffolder completes, `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.js`, `.eslintrc.json`, `app/`, `public/`, `next-env.d.ts` are all created. The scaffolder may pause if files exist — answer "Yes" to overwrite the empty initial state.

- [ ] **Step 2: Verify the dev server boots**

```bash
npm run dev -- --port 3000 &
sleep 6
curl -fsSL http://localhost:3000 > /dev/null && echo OK
kill %1 2>/dev/null || true
```

Expected: `OK`. If not, fix before continuing.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 + TS + Tailwind project"
```

---

## Task 2: Install runtime + dev dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
npm install \
  firebase@^11 \
  firebase-admin@^13 \
  framer-motion@^11 \
  gsap@^3 \
  lottie-react@^2 \
  three@^0.169 \
  @react-three/fiber@^9 \
  @react-three/drei@^9 \
  zod@^3 \
  react-hook-form@^7 \
  @hookform/resolvers@^3 \
  @radix-ui/react-dialog@^1 \
  @radix-ui/react-toast@^1 \
  @radix-ui/react-dropdown-menu@^2 \
  @radix-ui/react-tabs@^1 \
  @radix-ui/react-tooltip@^1 \
  @radix-ui/react-slot@^1 \
  clsx@^2 \
  tailwind-merge@^2 \
  server-only@^0.0.1
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D \
  vitest@^2 \
  @vitest/ui@^2 \
  @testing-library/react@^16 \
  @testing-library/jest-dom@^6 \
  @testing-library/user-event@^14 \
  jsdom@^25 \
  @vitejs/plugin-react@^4 \
  @playwright/test@^1.48 \
  @axe-core/playwright@^4 \
  @lhci/cli@^0.14 \
  @firebase/rules-unit-testing@^4 \
  firebase-tools@^13 \
  prettier@^3 \
  eslint-config-prettier@^9 \
  eslint-plugin-import@^2 \
  cross-env@^7 \
  concurrently@^9 \
  wait-on@^8 \
  @types/three@^0.169 \
  tsx@^4
```

- [ ] **Step 3: Install Playwright browsers**

```bash
npx playwright install --with-deps chromium firefox webkit
```

Expected: browsers download successfully. On macOS, `--with-deps` is a no-op; on Linux CI it installs system libs.

- [ ] **Step 4: Add the run scripts to `package.json`**

Replace the `scripts` block in `package.json` with:

```json
"scripts": {
  "dev": "next dev",
  "dev:emu": "concurrently -k -n next,emu \"npm:dev\" \"npm:emulators\"",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "format": "prettier --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "test:integration": "vitest run --config vitest.config.ts tests/integration",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "lighthouse": "lhci autorun",
  "emulators": "firebase emulators:start --only auth,firestore --project trivix-dev",
  "emulators:exec": "firebase emulators:exec --only auth,firestore --project trivix-dev",
  "seed": "tsx tests/fixtures/seed.ts"
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install runtime, dev, and tooling dependencies"
```

---

## Task 3: Add tsconfig path alias and base TS config

**Files:**

- Modify: `tsconfig.json`

- [ ] **Step 1: Replace the contents of `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", ".next", "playwright-report", "coverage"]
}
```

- [ ] **Step 2: Run typecheck to confirm baseline passes**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: tighten TS config (noUncheckedIndexedAccess, strict)"
```

---

## Task 4: Author `styles/theme.ts` (single source of theme truth)

**Files:**

- Create: `styles/theme.ts`

- [ ] **Step 1: Write `styles/theme.ts`**

```ts
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add styles/theme.ts
git commit -m "feat(theme): add theme tokens single source of truth"
```

---

## Task 5: Wire `tailwind.config.ts` to read from `styles/theme.ts`

**Files:**

- Modify: `tailwind.config.ts`

- [ ] **Step 1: Replace the contents of `tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
import { colors, radius, shadow, fontFamily } from "./styles/theme";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors,
      borderRadius: radius,
      boxShadow: shadow,
      fontFamily,
      backgroundImage: {
        "grid-floor":
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px)," +
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 2: Build to verify Tailwind compiles**

```bash
npm run build
```

Expected: build succeeds. (The default landing page may break visually — that's fine; we replace it in Task 24.)

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): wire Tailwind to consume theme tokens"
```

---

## Task 6: Configure fonts via `next/font` and `app/globals.css`

**Files:**

- Create: `styles/fonts.ts`

- [ ] **Step 1: Write `styles/fonts.ts`**

```ts
// styles/fonts.ts
import { Anton, Inter, JetBrains_Mono } from "next/font/google";

export const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-anton",
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const fontVariableClassName = [
  anton.variable,
  inter.variable,
  jetbrains.variable,
].join(" ");
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add styles/fonts.ts
git commit -m "feat(theme): configure Anton, Inter, JetBrains Mono via next/font"
```

---

## Task 7: Author `lib/utils/cn.ts` with TDD

**Files:**

- Create: `lib/utils/cn.ts`
- Test: `tests/unit/utils/cn.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/utils/cn.test.ts
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("merges conflicting tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/unit/utils/cn.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils/cn'`.

- [ ] **Step 3: Implement `cn`**

```ts
// lib/utils/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/unit/utils/cn.test.ts
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/cn.ts tests/unit/utils/cn.test.ts
git commit -m "feat(utils): add cn() helper with tests"
```

---

## Task 8: Author `lib/motion/tokens.ts`

**Files:**

- Create: `lib/motion/tokens.ts`

- [ ] **Step 1: Write `lib/motion/tokens.ts`**

```ts
// lib/motion/tokens.ts
// Motion tokens. No magic numbers in components — pull from here.

export const durations = {
  instant: 0,
  fast: 0.15,
  base: 0.28,
  slow: 0.48,
  scene: 0.8,
} as const;

export const easings = {
  standard: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
  emphasized: [0.2, 0.0, 0, 1] as [number, number, number, number],
  springy: [0.34, 1.56, 0.64, 1] as [number, number, number, number],
  decel: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
  accel: [0.4, 0.0, 1, 1] as [number, number, number, number],
} as const;

export const springs = {
  soft: { type: "spring" as const, stiffness: 140, damping: 18, mass: 0.9 },
  snappy: { type: "spring" as const, stiffness: 260, damping: 22, mass: 0.8 },
  bouncy: { type: "spring" as const, stiffness: 320, damping: 14, mass: 0.9 },
  heavy: { type: "spring" as const, stiffness: 90, damping: 22, mass: 1.4 },
};

export const stagger = {
  tight: 0.03,
  base: 0.06,
  loose: 0.12,
} as const;

export type MotionDuration = keyof typeof durations;
export type MotionEasing = keyof typeof easings;
export type MotionSpring = keyof typeof springs;
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add lib/motion/tokens.ts
git commit -m "feat(motion): add motion tokens (durations, easings, springs, stagger)"
```

---

## Task 9: Author `lib/motion/reduced-motion.ts` with TDD

**Files:**

- Create: `lib/motion/reduced-motion.ts`
- Test: `tests/unit/motion/reduced-motion.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/motion/reduced-motion.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { prefersReducedMotion } from "@/lib/motion/reduced-motion";

describe("prefersReducedMotion", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns false when matchMedia is undefined (SSR)", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when prefers-reduced-motion: reduce matches", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q === "(prefers-reduced-motion: reduce)",
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false when no preference", () => {
    vi.stubGlobal("matchMedia", () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(prefersReducedMotion()).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/unit/motion/reduced-motion.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/motion/reduced-motion.ts
export function prefersReducedMotion(): boolean {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/unit/motion/reduced-motion.test.ts
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/motion/reduced-motion.ts tests/unit/motion/reduced-motion.test.ts
git commit -m "feat(motion): add prefersReducedMotion helper"
```

---

## Task 10: Author `lib/motion/tier.ts` with TDD

**Files:**

- Create: `lib/motion/tier.ts`
- Test: `tests/unit/motion/tier.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/motion/tier.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { detectMotionTier } from "@/lib/motion/tier";

function setup(opts: {
  reduced?: boolean;
  coarse?: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  battery?: { level: number; charging: boolean } | null;
}) {
  const matchMedia = (q: string) => ({
    matches:
      (q.includes("reduced-motion") && !!opts.reduced) ||
      (q.includes("pointer: coarse") && !!opts.coarse),
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal("matchMedia", matchMedia);
  vi.stubGlobal("navigator", {
    deviceMemory: opts.deviceMemory ?? 8,
    hardwareConcurrency: opts.hardwareConcurrency ?? 8,
    getBattery: opts.battery
      ? async () => ({
          level: opts.battery!.level,
          charging: opts.battery!.charging,
        })
      : undefined,
  });
}

describe("detectMotionTier", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it('returns "off" when reduced-motion is set', async () => {
    setup({ reduced: true });
    expect(await detectMotionTier()).toBe("off");
  });

  it('returns "light" on coarse pointer (mobile)', async () => {
    setup({ coarse: true });
    expect(await detectMotionTier()).toBe("light");
  });

  it('returns "light" on low memory', async () => {
    setup({ deviceMemory: 2 });
    expect(await detectMotionTier()).toBe("light");
  });

  it('returns "light" on low CPU concurrency', async () => {
    setup({ hardwareConcurrency: 2 });
    expect(await detectMotionTier()).toBe("light");
  });

  it('returns "light" on low battery not charging', async () => {
    setup({ battery: { level: 0.1, charging: false } });
    expect(await detectMotionTier()).toBe("light");
  });

  it('returns "full" otherwise', async () => {
    setup({});
    expect(await detectMotionTier()).toBe("full");
  });

  it('returns "off" in SSR (no window)', async () => {
    vi.stubGlobal("window", undefined);
    expect(await detectMotionTier()).toBe("off");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/unit/motion/tier.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// lib/motion/tier.ts
import { prefersReducedMotion } from "./reduced-motion";

export type MotionTier = "full" | "light" | "off";

interface NavigatorWithExtras extends Navigator {
  deviceMemory?: number;
  getBattery?: () => Promise<{ level: number; charging: boolean }>;
}

export async function detectMotionTier(): Promise<MotionTier> {
  if (typeof window === "undefined") return "off";

  if (prefersReducedMotion()) return "off";

  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  if (coarse) return "light";

  const nav = navigator as NavigatorWithExtras;
  if ((nav.deviceMemory ?? 8) < 4) return "light";
  if ((nav.hardwareConcurrency ?? 8) < 4) return "light";

  if (typeof nav.getBattery === "function") {
    try {
      const battery = await nav.getBattery();
      if (battery.level < 0.2 && !battery.charging) return "light";
    } catch {
      // battery API failure → ignore, fall through
    }
  }

  return "full";
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/unit/motion/tier.test.ts
```

Expected: PASS — 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/motion/tier.ts tests/unit/motion/tier.test.ts
git commit -m "feat(motion): add detectMotionTier (full/light/off)"
```

---

## Task 11: Author `hooks/useReducedMotion.ts` and `hooks/useMotionTier.ts`

**Files:**

- Create: `hooks/useReducedMotion.ts`
- Create: `hooks/useMotionTier.ts`

- [ ] **Step 1: Write `hooks/useReducedMotion.ts`**

```ts
// hooks/useReducedMotion.ts
"use client";
import { useEffect, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

- [ ] **Step 2: Write `hooks/useMotionTier.ts`**

```ts
// hooks/useMotionTier.ts
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
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add hooks/useReducedMotion.ts hooks/useMotionTier.ts
git commit -m "feat(motion): add useReducedMotion and useMotionTier hooks"
```

---

## Task 12: Author `lib/avatar/seed.ts` with TDD

**Files:**

- Create: `lib/avatar/seed.ts`
- Test: `tests/unit/avatar/seed.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/avatar/seed.test.ts
import { describe, it, expect } from "vitest";
import { seedToGradient, AVATAR_GRADIENTS } from "@/lib/avatar/seed";

describe("seedToGradient", () => {
  it("returns a known gradient", () => {
    const g = seedToGradient("user-123");
    expect(AVATAR_GRADIENTS).toContainEqual(g);
  });

  it("is deterministic for the same seed", () => {
    expect(seedToGradient("abc")).toEqual(seedToGradient("abc"));
  });

  it("distributes across the gradient set", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(seedToGradient(`user-${i}`).id);
    }
    // 8 gradients; with 200 seeds we should see most of them
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });

  it("handles empty string without throwing", () => {
    expect(() => seedToGradient("")).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/unit/avatar/seed.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
// lib/avatar/seed.ts
export interface AvatarGradient {
  id: string;
  from: string;
  to: string;
  text: string;
}

export const AVATAR_GRADIENTS: readonly AvatarGradient[] = [
  { id: "red", from: "#ff2e3e", to: "#7a0010", text: "#ffffff" },
  { id: "blue", from: "#1ea7ff", to: "#0a3370", text: "#ffffff" },
  { id: "green", from: "#1fd66a", to: "#08401d", text: "#ffffff" },
  { id: "gold", from: "#ffd400", to: "#8a6a00", text: "#111111" },
  { id: "magenta", from: "#ff3da3", to: "#5a0a3a", text: "#ffffff" },
  { id: "cyan", from: "#22d3ee", to: "#0a4555", text: "#111111" },
  { id: "violet", from: "#a855f7", to: "#3b0764", text: "#ffffff" },
  { id: "amber", from: "#f97316", to: "#5a2200", text: "#ffffff" },
];

function hash(s: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

export function seedToGradient(seed: string): AvatarGradient {
  const h = hash(seed || "default");
  const idx = h % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx]!;
}

export function initialsFor(firstName: string, lastName: string): string {
  const f = (firstName?.trim()?.[0] ?? "").toUpperCase();
  const l = (lastName?.trim()?.[0] ?? "").toUpperCase();
  return f + l || "?";
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run tests/unit/avatar/seed.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/avatar/seed.ts tests/unit/avatar/seed.test.ts
git commit -m "feat(avatar): add deterministic seed-to-gradient mapping"
```

---

## Task 13: Author `components/ui/Button.tsx`

**Files:**

- Create: `components/ui/Button.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/Button.tsx
"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "quad-r"
  | "quad-b"
  | "quad-y"
  | "quad-g";

type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-red text-text-primary hover:shadow-glow-red active:scale-[0.97] transition",
  secondary:
    "bg-brand-ink text-text-primary border border-brand-line hover:border-brand-red transition",
  ghost: "bg-transparent text-text-primary hover:bg-brand-ink transition",
  danger: "bg-game-red text-text-primary hover:shadow-glow-quad-r transition",
  "quad-r": "bg-game-red text-text-primary hover:shadow-glow-quad-r transition",
  "quad-b":
    "bg-game-blue text-text-primary hover:shadow-glow-quad-b transition",
  "quad-y":
    "bg-game-yellow text-brand-black hover:shadow-glow-quad-y transition",
  "quad-g":
    "bg-game-green text-text-primary hover:shadow-glow-quad-g transition",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-md",
  md: "h-11 px-5 text-base rounded-md",
  lg: "h-14 px-7 text-lg rounded-lg",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as never}
        className={cn(
          "inline-flex items-center justify-center font-semibold select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-brand-black",
          "disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Button.tsx
git commit -m "feat(ui): add Button primitive with variants and sizes"
```

---

## Task 14: Author `components/ui/Input.tsx`

**Files:**

- Create: `components/ui/Input.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/Input.tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? React.useId();
    const errorId = error ? `${inputId}-err` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={
            [errorId, hintId].filter(Boolean).join(" ") || undefined
          }
          className={cn(
            "h-11 px-4 rounded-md bg-brand-ink border border-brand-line text-text-primary",
            "placeholder:text-text-faint",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:border-brand-red",
            "aria-[invalid=true]:border-game-red aria-[invalid=true]:ring-game-red",
            "transition",
            className,
          )}
          {...props}
        />
        {hint && !error && (
          <p id={hintId} className="text-xs text-text-faint">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="text-xs text-game-red">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Input.tsx
git commit -m "feat(ui): add Input primitive with label/error/hint"
```

---

## Task 15: Author `components/ui/Card.tsx`

**Files:**

- Create: `components/ui/Card.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/Card.tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Variant =
  | "default"
  | "elevated"
  | "neon"
  | "quad-r"
  | "quad-b"
  | "quad-y"
  | "quad-g";

const variants: Record<Variant, string> = {
  default: "bg-brand-ink border border-brand-line",
  elevated: "bg-brand-ink border border-brand-line shadow-soft",
  neon: "bg-brand-ink border border-brand-red shadow-glow-red",
  "quad-r": "bg-brand-ink border border-game-red shadow-glow-quad-r",
  "quad-b": "bg-brand-ink border border-game-blue shadow-glow-quad-b",
  "quad-y": "bg-brand-ink border border-game-yellow shadow-glow-quad-y",
  "quad-g": "bg-brand-ink border border-game-green shadow-glow-quad-g",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
  interactive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg p-5",
        variants[variant],
        interactive &&
          "transition hover:-translate-y-0.5 hover:shadow-soft cursor-pointer",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Card.tsx
git commit -m "feat(ui): add Card primitive with variants"
```

---

## Task 16: Author `components/ui/Avatar.tsx`

**Files:**

- Create: `components/ui/Avatar.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/Avatar.tsx
"use client";
import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { seedToGradient, initialsFor } from "@/lib/avatar/seed";

type Size = "xs" | "sm" | "md" | "lg";

const sizes: Record<Size, string> = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 text-2xl",
};

export interface AvatarProps {
  seed: string;
  firstName?: string;
  lastName?: string;
  size?: Size;
  className?: string;
}

export function Avatar({
  seed,
  firstName = "",
  lastName = "",
  size = "md",
  className,
}: AvatarProps) {
  const g = seedToGradient(seed);
  const initials = initialsFor(firstName, lastName);
  return (
    <div
      role="img"
      aria-label={
        firstName || lastName
          ? `${firstName} ${lastName}`.trim()
          : "User avatar"
      }
      className={cn(
        "rounded-full inline-flex items-center justify-center font-semibold select-none",
        sizes[size],
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(160deg, ${g.from}, ${g.to})`,
        color: g.text,
      }}
    >
      {initials}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Avatar.tsx
git commit -m "feat(ui): add Avatar (auto initials + seeded gradient)"
```

---

## Task 17: Author `components/ui/Badge.tsx`

**Files:**

- Create: `components/ui/Badge.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/ui/Badge.tsx
import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone =
  | "host"
  | "captain"
  | "pro"
  | "pending"
  | "neutral"
  | "success"
  | "error";

const tones: Record<Tone, string> = {
  host: "bg-brand-red/15 text-brand-red border-brand-red/40",
  captain: "bg-game-yellow/15 text-game-yellow border-game-yellow/40",
  pro: "bg-brand-red/15 text-brand-red border-brand-red/40",
  pending: "bg-game-blue/15 text-game-blue border-game-blue/40",
  neutral: "bg-brand-line text-text-muted border-brand-line",
  success: "bg-game-green/15 text-game-green border-game-green/40",
  error: "bg-game-red/15 text-game-red border-game-red/40",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full border",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/Badge.tsx
git commit -m "feat(ui): add Badge primitive with tones"
```

---

## Task 18: Author `components/ui/Toast.tsx` and `ToastProvider.tsx`

**Files:**

- Create: `components/ui/Toast.tsx`
- Create: `components/ui/ToastProvider.tsx`

- [ ] **Step 1: Write `components/ui/Toast.tsx`**

```tsx
// components/ui/Toast.tsx
"use client";
import * as ToastPrimitive from "@radix-ui/react-toast";
import * as React from "react";
import { cn } from "@/lib/utils/cn";

type Tone = "default" | "success" | "error" | "warn";

const tones: Record<Tone, string> = {
  default: "border-brand-line",
  success: "border-game-green",
  error: "border-game-red",
  warn: "border-game-yellow",
};

export interface ToastItemProps {
  title?: string;
  description?: string;
  tone?: Tone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ToastItem({
  title,
  description,
  tone = "default",
  open,
  onOpenChange,
}: ToastItemProps) {
  return (
    <ToastPrimitive.Root
      open={open}
      onOpenChange={onOpenChange}
      duration={4000}
      className={cn(
        "bg-brand-ink border rounded-md p-4 shadow-soft text-text-primary",
        "data-[state=open]:animate-[slideIn_180ms_cubic-bezier(0.4,0,0.2,1)]",
        "data-[state=closed]:animate-[slideOut_180ms_cubic-bezier(0.4,0,1,1)]",
        tones[tone],
      )}
    >
      {title && (
        <ToastPrimitive.Title className="font-semibold">
          {title}
        </ToastPrimitive.Title>
      )}
      {description && (
        <ToastPrimitive.Description className="text-sm text-text-muted">
          {description}
        </ToastPrimitive.Description>
      )}
    </ToastPrimitive.Root>
  );
}
```

- [ ] **Step 2: Write `components/ui/ToastProvider.tsx`**

```tsx
// components/ui/ToastProvider.tsx
"use client";
import * as ToastPrimitive from "@radix-ui/react-toast";
import * as React from "react";
import { ToastItem } from "./Toast";

interface ToastInput {
  title?: string;
  description?: string;
  tone?: "default" | "success" | "error" | "warn";
}

interface ToastContextValue {
  push: (input: ToastInput) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

interface ToastEntry extends ToastInput {
  id: string;
  open: boolean;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastEntry[]>([]);

  const push = React.useCallback((input: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev.slice(-2), { ...input, id, open: true }]);
  }, []);

  const setOpen = (id: string, open: boolean) => {
    setToasts((prev) => (open ? prev : prev.filter((t) => t.id !== id)));
  };

  return (
    <ToastContext.Provider value={{ push }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            title={t.title}
            description={t.description}
            tone={t.tone}
            open={t.open}
            onOpenChange={(open) => setOpen(t.id, open)}
          />
        ))}
        <ToastPrimitive.Viewport className="fixed top-4 right-4 flex flex-col gap-2 w-[360px] max-w-[calc(100vw-2rem)] z-[60] outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
```

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add components/ui/Toast.tsx components/ui/ToastProvider.tsx
git commit -m "feat(ui): add Toast primitive and ToastProvider"
```

---

## Task 19: Author `components/ui/index.ts` barrel

**Files:**

- Create: `components/ui/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
// components/ui/index.ts
export { Button, type ButtonProps } from "./Button";
export { Input, type InputProps } from "./Input";
export { Card, type CardProps } from "./Card";
export { Avatar, type AvatarProps } from "./Avatar";
export { Badge, type BadgeProps } from "./Badge";
export { ToastItem, type ToastItemProps } from "./Toast";
export { ToastProvider, useToast } from "./ToastProvider";
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/ui/index.ts
git commit -m "feat(ui): add barrel export"
```

---

## Task 20: Author `components/layout/ThemeProvider.tsx`

**Files:**

- Create: `components/layout/ThemeProvider.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/layout/ThemeProvider.tsx
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/layout/ThemeProvider.tsx
git commit -m "feat(layout): add ThemeProvider exposing motion tier"
```

---

## Task 21: Author `components/three/StaticGridFloor.tsx` (SVG fallback)

**Files:**

- Create: `components/three/StaticGridFloor.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/three/StaticGridFloor.tsx
import * as React from "react";

export function StaticGridFloor({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: "#050608",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px)," +
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0 1px, transparent 1px 60px)," +
          "radial-gradient(120% 80% at 50% 100%, rgba(255,31,58,0.18), transparent 60%)",
      }}
    />
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/three/StaticGridFloor.tsx
git commit -m "feat(three): add SVG/CSS static grid floor fallback"
```

---

## Task 22: Author `components/three/GridFloor.tsx` and `components/three/BrandScene.tsx`

**Files:**

- Create: `components/three/GridFloor.tsx`
- Create: `components/three/BrandScene.tsx`

- [ ] **Step 1: Write `components/three/GridFloor.tsx`**

```tsx
// components/three/GridFloor.tsx
"use client";
import * as React from "react";
import { useFrame } from "@react-three/fiber";

export function GridFloor() {
  const ref = React.useRef<THREE.GridHelper>(null);
  useFrame((_state, dt) => {
    if (ref.current) {
      ref.current.position.z = (ref.current.position.z + dt * 0.6) % 4;
    }
  });
  // Default grid: 40 size, 40 divisions
  return (
    <gridHelper
      ref={ref}
      args={[40, 40, "#ff1f3a", "#1a1c22"]}
      position={[0, -1.2, 0]}
      rotation={[0, 0, 0]}
    />
  );
}
```

- [ ] **Step 2: Write `components/three/BrandScene.tsx`**

```tsx
// components/three/BrandScene.tsx
"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { useMotionTier } from "@/hooks/useMotionTier";
import { StaticGridFloor } from "./StaticGridFloor";

// Dynamic-import the R3F Canvas + scene contents so they're never in the critical bundle.
const FullScene = dynamic(
  () => import("./FullScene").then((m) => m.FullScene),
  {
    ssr: false,
    loading: () => null,
  },
);

export function BrandScene() {
  const tier = useMotionTier();

  if (tier === "full") return <FullScene />;
  return <StaticGridFloor className="absolute inset-0 -z-10" />;
}
```

- [ ] **Step 3: Write `components/three/FullScene.tsx`**

```tsx
// components/three/FullScene.tsx
"use client";
import * as React from "react";
import { Canvas } from "@react-three/fiber";
import { GridFloor } from "./GridFloor";

export function FullScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 1.4, 4], fov: 60 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <color attach="background" args={["#050608"]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[3, 4, 2]} intensity={2.0} color="#ff1f3a" />
        <GridFloor />
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add components/three/GridFloor.tsx components/three/BrandScene.tsx components/three/FullScene.tsx
git commit -m "feat(three): add R3F BrandScene with tier-aware fallback"
```

---

## Task 23: Author `components/motion/MotionPage.tsx` skeleton

**Files:**

- Create: `components/motion/MotionPage.tsx`

- [ ] **Step 1: Write the component**

```tsx
// components/motion/MotionPage.tsx
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
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/motion/MotionPage.tsx
git commit -m "feat(motion): add MotionPage skeleton (tier-aware fade)"
```

---

## Task 24: Author `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/error.tsx`, `app/not-found.tsx`

**Files:**

- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Modify: `app/page.tsx`
- Create: `app/error.tsx`
- Create: `app/not-found.tsx`

- [ ] **Step 1: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html,
body {
  background-color: #050608;
  color: #ffffff;
  font-feature-settings: "cv11", "ss01";
}

@keyframes slideIn {
  from {
    transform: translateX(120%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(120%);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from "next";
import { fontVariableClassName } from "@/styles/fonts";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { BrandScene } from "@/components/three/BrandScene";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trivix",
  description: "High-energy trivia for hosts, players, and team captains.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  openGraph: {
    title: "Trivix",
    description: "High-energy trivia for hosts, players, and team captains.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={fontVariableClassName}>
      <body className="font-body antialiased min-h-screen">
        <ThemeProvider>
          <ToastProvider>
            <div className="relative min-h-screen overflow-hidden">
              <BrandScene />
              <div className="relative z-10">{children}</div>
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace `app/page.tsx`**

```tsx
// app/page.tsx
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <p className="text-text-faint uppercase tracking-[6px] text-xs mb-4">
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
        <Button size="lg">Get started</Button>
        <Button size="lg" variant="secondary">
          I&rsquo;m a host
        </Button>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Write `app/error.tsx`**

```tsx
// app/error.tsx
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
```

- [ ] **Step 5: Write `app/not-found.tsx`**

```tsx
// app/not-found.tsx
import Link from "next/link";
import { Button } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-7xl tracking-widest mb-4">404</h1>
      <p className="text-text-muted mb-8">That round doesn&rsquo;t exist.</p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </main>
  );
}
```

- [ ] **Step 6: Boot the dev server and verify**

```bash
npm run dev -- --port 3000 &
sleep 6
curl -fsSL http://localhost:3000 | grep -q "TRIVIX" && echo "OK"
kill %1 2>/dev/null || true
```

Expected: `OK`.

- [ ] **Step 7: Commit**

```bash
git add app/
git commit -m "feat(app): themed landing, error, and 404 pages"
```

---

## Task 25: Author `app/api/health/route.ts`

**Files:**

- Create: `app/api/health/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/health/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}
```

- [ ] **Step 2: Verify it responds**

```bash
npm run dev -- --port 3000 &
sleep 6
curl -fsSL http://localhost:3000/api/health | grep -q '"ok":true' && echo "OK"
kill %1 2>/dev/null || true
```

Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add app/api/health/route.ts
git commit -m "feat(api): add health endpoint"
```

---

## Task 26: Author Firebase client/admin/session skeletons

**Files:**

- Create: `lib/firebase/client.ts`
- Create: `lib/firebase/admin.ts`
- Create: `lib/firebase/session.ts`

- [ ] **Step 1: Write `lib/firebase/client.ts`**

```ts
// lib/firebase/client.ts
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function ensureApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp(config);
}

export const firebaseApp = ensureApp();
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDb = getFirestore(firebaseApp);

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_EMULATORS === "true" &&
  !(globalThis as { __TRIVIX_EMU__?: boolean }).__TRIVIX_EMU__
) {
  connectAuthEmulator(firebaseAuth, "http://127.0.0.1:9099", {
    disableWarnings: true,
  });
  connectFirestoreEmulator(firebaseDb, "127.0.0.1", 8080);
  (globalThis as { __TRIVIX_EMU__?: boolean }).__TRIVIX_EMU__ = true;
}
```

- [ ] **Step 2: Write `lib/firebase/admin.ts`**

```ts
// lib/firebase/admin.ts
import "server-only";
import {
  getApps,
  initializeApp,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]!;
  const useEmulator = process.env.USE_FIREBASE_EMULATORS === "true";
  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "127.0.0.1:9099";
    return initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "trivix-dev",
    });
  }
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (sa) {
    return initializeApp({ credential: cert(JSON.parse(sa)) });
  }
  return initializeApp({ credential: applicationDefault() });
}

export const adminApp = getAdminApp();
export const adminAuth = getAdminAuth(adminApp);
export const adminDb = getAdminFirestore(adminApp);
```

- [ ] **Step 3: Write `lib/firebase/session.ts`**

```ts
// lib/firebase/session.ts
import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./admin";

const COOKIE_NAME = "__session";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
}

export async function setSessionCookie(idToken: string): Promise<void> {
  const cookie = await createSessionCookie(idToken);
  (await cookies()).set(COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: FIVE_DAYS_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getSessionUid(): Promise<string | null> {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    return decoded.uid;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add lib/firebase/
git commit -m "feat(firebase): add client, admin, and session helpers"
```

---

## Task 27: Configure Firebase Emulator Suite

**Files:**

- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.rules`
- Create: `firestore.indexes.json`
- Create: `.env.example`
- Create: `.env.local`

- [ ] **Step 1: Write `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

- [ ] **Step 2: Write `.firebaserc`**

```json
{
  "projects": {
    "default": "trivix-dev"
  }
}
```

- [ ] **Step 3: Write `firestore.rules` (default-deny baseline)**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default deny. Per-collection rules land in Plan 2 / Plan 3 / Plan 4.
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 4: Write `firestore.indexes.json`**

```json
{
  "indexes": [],
  "fieldOverrides": []
}
```

- [ ] **Step 5: Write `.env.example`**

```bash
# Public (browser)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=trivix-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server
FIREBASE_PROJECT_ID=trivix-dev
USE_FIREBASE_EMULATORS=true
# Production only:
# FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

- [ ] **Step 6: Write `.env.local`**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=trivix-dev.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=trivix-dev
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=trivix-dev.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=000000000000
NEXT_PUBLIC_FIREBASE_APP_ID=1:000000000000:web:0000000000000000000000
NEXT_PUBLIC_USE_EMULATORS=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000

FIREBASE_PROJECT_ID=trivix-dev
USE_FIREBASE_EMULATORS=true
```

- [ ] **Step 7: Verify emulators boot**

```bash
npx firebase emulators:start --only auth,firestore --project trivix-dev &
EMU_PID=$!
sleep 8
curl -fsSL http://127.0.0.1:8080 | head -c 200
curl -fsSL http://127.0.0.1:9099 | head -c 200
kill $EMU_PID 2>/dev/null || true
```

Expected: both emulators respond. If `firebase` complains about login, the `--project trivix-dev` flag should be enough; for CI we'll use `firebase emulators:exec` which doesn't need login.

- [ ] **Step 8: Commit**

```bash
git add firebase.json .firebaserc firestore.rules firestore.indexes.json .env.example .env.local
git commit -m "chore(firebase): emulator suite + default-deny rules baseline"
```

(Note: `.env.local` is in the gitignore — confirm with `git status` that it was NOT committed; if it was, run `git rm --cached .env.local` and commit.)

---

## Task 28: Author Vitest config + setup + emulator bootstrap + emulator smoke test

**Files:**

- Create: `vitest.config.ts`
- Create: `tests/setup/vitest-setup.ts`
- Create: `tests/setup/emulator-bootstrap.ts`
- Create: `tests/integration/firebase/emulator-smoke.test.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest-setup.ts"],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
    ],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
  },
});
```

- [ ] **Step 2: Write `tests/setup/vitest-setup.ts`**

```ts
// tests/setup/vitest-setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 3: Write `tests/setup/emulator-bootstrap.ts`**

```ts
// tests/setup/emulator-bootstrap.ts
// Sets emulator env so Admin SDK / @firebase/rules-unit-testing connect locally.
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
process.env.GCLOUD_PROJECT = "trivix-dev";
process.env.FIREBASE_PROJECT_ID = "trivix-dev";
process.env.USE_FIREBASE_EMULATORS = "true";
```

- [ ] **Step 4: Write `tests/integration/firebase/emulator-smoke.test.ts`**

```ts
// tests/integration/firebase/emulator-smoke.test.ts
import "@/tests/setup/emulator-bootstrap";
import { describe, it, expect, beforeAll } from "vitest";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let app: ReturnType<typeof initializeApp>;

beforeAll(() => {
  app = initializeApp({ projectId: "trivix-dev" }, "smoke");
});

describe("firebase emulator", () => {
  it("round-trips a write and read", async () => {
    const db = getFirestore(app);
    const ref = db.collection("_smoke").doc("hello");
    await ref.set({ ok: true });
    const snap = await ref.get();
    expect(snap.data()).toEqual({ ok: true });
    await ref.delete();
    await deleteApp(app);
  });
});
```

- [ ] **Step 5: Run unit tests to confirm baseline still green**

```bash
npm run test
```

Expected: all unit tests pass; the integration test will fail unless the emulator is running.

- [ ] **Step 6: Run integration test against running emulator**

In one terminal:

```bash
npm run emulators
```

In another:

```bash
npm run test:integration
```

Expected: emulator-smoke test passes.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts tests/setup/ tests/integration/
git commit -m "test: add Vitest config + emulator bootstrap + smoke test"
```

---

## Task 29: Author Playwright config + landing/health/axe E2E specs

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/e2e/landing.spec.ts`
- Create: `tests/e2e/health.spec.ts`
- Create: `tests/e2e/axe.spec.ts`

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run start -- --port 3000",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_USE_EMULATORS: "false",
    },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
```

- [ ] **Step 2: Write `tests/e2e/health.spec.ts`**

```ts
// tests/e2e/health.spec.ts
import { test, expect } from "@playwright/test";

test("health endpoint returns ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.ok).toBe(true);
});
```

- [ ] **Step 3: Write `tests/e2e/landing.spec.ts`**

```ts
// tests/e2e/landing.spec.ts
import { test, expect } from "@playwright/test";

test("landing page renders branded heading and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /trivix/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /get started/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /i'?m a host/i }),
  ).toBeVisible();
});

test("respects prefers-reduced-motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  // motion tier should be 'off'; ThemeProvider sets data-motion-tier
  const tier = await page
    .locator("[data-motion-tier]")
    .first()
    .getAttribute("data-motion-tier");
  expect(tier).toBe("off");
  await context.close();
});
```

- [ ] **Step 4: Write `tests/e2e/axe.spec.ts`**

```ts
// tests/e2e/axe.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing page has no serious or critical a11y violations", async ({
  page,
}) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});

test("404 page has no serious or critical a11y violations", async ({
  page,
}) => {
  await page.goto("/this-route-does-not-exist");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
    .analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
```

- [ ] **Step 5: Run E2E tests**

```bash
npm run test:e2e
```

Expected: all three specs pass on chromium, firefox, and webkit. Build will take ~60–120s the first time. If `wait-on` errors, increase timeout.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts tests/e2e/
git commit -m "test(e2e): add Playwright config with landing, health, and axe specs"
```

---

## Task 30: Author Lighthouse CI config

**Files:**

- Create: `lighthouserc.json`

- [ ] **Step 1: Write `lighthouserc.json`**

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start -- --port 3000",
      "url": ["http://127.0.0.1:3000/"],
      "numberOfRuns": 1,
      "settings": {
        "preset": "desktop"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.9 }],
        "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

- [ ] **Step 2: Run Lighthouse CI locally to verify**

```bash
npm run build
npm run lighthouse
```

Expected: assertions pass (warnings allowed; only accessibility is a hard error).

- [ ] **Step 3: Commit**

```bash
git add lighthouserc.json
git commit -m "test(lighthouse): add LHCI config (perf warn 0.85, a11y error 0.9)"
```

---

## Task 31: Author `.github/workflows/ci.yml`

**Files:**

- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: ci

on:
  push:
    branches: [main]
  pull_request:

jobs:
  lint-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx vitest run tests/unit

  integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"
      - run: npm ci
      - run: npx firebase emulators:exec --only auth,firestore --project trivix-dev "npx vitest run tests/integration"

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npx playwright test
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7

  lighthouse:
    runs-on: ubuntu-latest
    needs: [e2e]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run lighthouse
        continue-on-error: true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow (lint, unit, integration, e2e, lighthouse)"
```

---

## Task 32: Author `netlify.toml` and verify Netlify deploy

**Files:**

- Create: `netlify.toml`

- [ ] **Step 1: Write `netlify.toml`**

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_TELEMETRY_DISABLED = "1"
  NODE_VERSION = "20"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

- [ ] **Step 2: Install the Netlify Next plugin (declared in toml; also needs install)**

```bash
npm install -D @netlify/plugin-nextjs@^5
```

- [ ] **Step 3: Smoke build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add netlify.toml package.json package-lock.json
git commit -m "chore(deploy): add Netlify config with Next plugin and security headers"
```

---

## Task 33: Author `README.md` quickstart

**Files:**

- Create: `README.md`

- [ ] **Step 1: Write the README**

````markdown
# Trivix

High-energy trivia for hosts, players, and team captains.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Firebase (Auth + Firestore + Admin SDK) · Framer Motion · GSAP · React Three Fiber · Lottie · Radix UI · Vitest · Playwright · Lighthouse CI · Netlify.

See `docs/superpowers/specs/` for design specs and `docs/superpowers/plans/` for implementation plans.

## Local development

Prerequisites: Node 20+, Java 17 (for Firebase emulator).

```bash
npm install
cp .env.example .env.local           # adjust values if needed
npx firebase login                    # one-time, uses your Google account
npm run dev:emu                       # Next dev + emulators in parallel
```

Visit http://localhost:3000 (app) and http://localhost:4000 (emulator UI).

## Scripts

| Command                    | What it does                                                              |
| -------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`              | Next dev server                                                           |
| `npm run dev:emu`          | Next dev + Firebase emulators in parallel                                 |
| `npm run build`            | Production build                                                          |
| `npm run start`            | Run production build                                                      |
| `npm run typecheck`        | tsc --noEmit                                                              |
| `npm run lint`             | ESLint                                                                    |
| `npm run format`           | Prettier write                                                            |
| `npm test`                 | Vitest unit + integration                                                 |
| `npm run test:integration` | Vitest integration only (needs emulator running, or use `emulators:exec`) |
| `npm run test:e2e`         | Playwright E2E + axe                                                      |
| `npm run lighthouse`       | Lighthouse CI                                                             |
| `npm run emulators`        | Firebase Auth + Firestore emulators                                       |
| `npm run seed`             | Seed emulator with fixture users (populated in Plan 2)                    |

## Deployment

Push to `main` → Netlify build → production. PRs get deploy previews. The first admin must be created by manually setting `users/{founder-uid}.isAdmin = true` in the Firestore console after signing up.

Required Netlify environment variables (production):

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_USE_EMULATORS=false
NEXT_PUBLIC_SITE_URL=https://trivix.app
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON   # JSON string from a service account
USE_FIREBASE_EMULATORS=false
```
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README quickstart"
```

---

## Task 34: Final verification pass

- [ ] **Step 1: Format**

```bash
npm run format
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Typecheck**

```bash
npm run typecheck
```

Expected: zero errors.

- [ ] **Step 4: Unit tests**

```bash
npm run test
```

Expected: all unit tests pass; integration tests skip or fail-on-no-emulator (acceptable in this step).

- [ ] **Step 5: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Integration tests against emulator**

```bash
npx firebase emulators:exec --only auth,firestore --project trivix-dev "npx vitest run tests/integration"
```

Expected: emulator-smoke test passes.

- [ ] **Step 7: E2E**

```bash
npm run test:e2e
```

Expected: all three E2E specs pass on chromium, firefox, webkit.

- [ ] **Step 8: Lighthouse local check**

```bash
npm run lighthouse
```

Expected: assertions pass (a11y must be ≥ 0.9; perf is a soft warn).

- [ ] **Step 9: Commit anything caught by formatter / linter**

```bash
git add -A
git diff --cached --quiet || git commit -m "chore: format pass"
```

- [ ] **Step 10: Confirm final state**

```bash
git log --oneline
git status
```

Expected: clean working tree, ~30+ commits on `main`. Ready for Plan 2.

---

## Done

Deliverables of this plan:

1. Themed Trivix landing page renders locally and on Netlify
2. R3F BrandScene with tier-aware fallback
3. UI primitives (Button, Input, Card, Avatar, Badge, Toast)
4. Motion-tier detection (`full` / `light` / `off`) with reduced-motion fallback
5. Firebase Emulator Suite locally + in CI; Admin SDK isolated to `server-only`
6. Vitest unit + integration suite
7. Playwright E2E + axe-core
8. Lighthouse CI
9. GitHub Actions pipeline
10. Netlify deploy config with security headers
11. Default-deny Firestore rules baseline (real rules land in Plan 2/3/4)

Plan 2 (Auth & profiles) builds on this foundation.
