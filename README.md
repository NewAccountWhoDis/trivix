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

| Command | What it does |
|---|---|
| `npm run dev` | Next dev server |
| `npm run dev:emu` | Next dev + Firebase emulators in parallel |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | ESLint |
| `npm run format` | Prettier write |
| `npm test` | Vitest unit + integration |
| `npm run test:integration` | Vitest integration only (needs emulator running, or use `emulators:exec`) |
| `npm run test:e2e` | Playwright E2E + axe |
| `npm run lighthouse` | Lighthouse CI |
| `npm run emulators` | Firebase Auth + Firestore emulators |
| `npm run seed` | Seed emulator with fixture users (populated in Plan 2) |

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
