# Trivix — Foundation Slice (Slice 1) Design

**Date:** 2026-05-04
**Status:** Draft, pending implementation plan
**Slice:** 1 of N. Live games, scoring, and venue concepts are out of scope and will be brainstormed as separate slices.

---

## 1. Purpose & Scope

Trivix is a web app for trivia hosts and players, hosted on Netlify. Comparable: trivtrak.com, but with a high-graphics, motion-rich, "game-show" identity.

**Slice 1 delivers:**
- Project scaffolding (Next.js 15 App Router, TypeScript, Tailwind, Firebase Auth + Firestore, Netlify deploy)
- Email/password and Google authentication, with email-verification gate and provider linking on email collision
- Multi-step signup wizard capturing name, unique display name, role intent
- User profiles with auto-generated initials avatars, public profile pages, private settings page
- Team creation, invite-code joining, captain-approved membership, manual captain transfer
- Host-application queue and admin approval flow (hosts get a "Host" badge and a placeholder `/host` page; live game tools arrive in a later slice)
- Lean admin portal: pending host approvals, all-users list with delete + revoke pro, all-teams list with delete
- Cinematic-overkill motion system (R3F WebGL, Framer Motion, GSAP, Lottie) with three runtime tiers (`full` / `light` / `off`) honoring `prefers-reduced-motion`

**Slice 1 explicitly does NOT include:**
- Live trivia games, real-time question delivery, scoring runtime
- Public team browsing (invite-code only)
- User-uploaded avatar photos (curated avatar chooser deferred; auto-initials only for now)
- Multi-factor auth, Apple sign-in, magic-link sign-in
- Account merge across different emails
- Audit logs, role-tiered admins, impersonation
- Settings-page motion toggle
- Ambient audio
- Zustand or other client state-management library
- Cypress (Playwright instead)
- Visual regression tooling

---

## 2. Tech Stack

- **Framework:** Next.js 15, App Router, TypeScript, React Server Components where practical
- **Styling:** Tailwind CSS with theme tokens centralized in `styles/theme.ts`
- **Auth & DB:** Firebase Auth (email/password + Google), Firestore, Firebase Admin SDK in route handlers
- **Hosting:** Netlify (Next.js plugin), Netlify Functions for route handlers
- **Animation:** Framer Motion (component motion), GSAP (scene transitions / page wipes), Lottie (vector illustrations), React Three Fiber + drei (ambient WebGL)
- **Forms & validation:** React Hook Form + Zod, Zod schemas shared between client and server
- **UI primitives:** Radix UI as headless base, themed wrappers in `components/ui/`
- **Display font:** Anton (kinetic headlines). Body: Inter variable. Mono: JetBrains Mono (invite codes).
- **Testing:** Vitest (unit + integration), `@firebase/rules-unit-testing` (rules), Playwright + axe-core (E2E + a11y), Lighthouse CI (perf, soft-fail)
- **Emulators:** Firebase Emulator Suite for local dev and CI

**Architectural posture (Hybrid):**
- Client SDK reads user profile, team data, and real-time join-request updates via `onSnapshot`.
- Admin SDK in Next.js route handlers handles all sensitive writes (role flips, captain transfer, host approval, deletes, account-creation transactions).
- Firestore security rules act as defense-in-depth, denying any client-side write to sensitive fields.

---

## 3. Visual & Brand System

**Brand identity (used for marketing, auth, dashboards, settings):**
- Primary surface: deep black (`#050608`) with a recurring perspective grid-floor texture
- Hero color: brand red (`#ff1f3a`) with neon glow on interactives
- Type: Anton display, Inter body, white primary text
- Distinctive, confident, owns the "Trivix" namespace

**Gameplay language (used for answer buttons, category chips, score panels — populated in later slices):**
- Four-color quad: red, blue, yellow, green (familiar Kahoot/HQ Trivia/Trivial Pursuit answer-button language)
- Each color has a defined role; not used decoratively elsewhere
- Yellow uses black text (contrast)

**Theme tokens** (consumed by Tailwind config; never hardcode hex):

```
colors:
  brand-black:    #050608
  brand-ink:      #0d0e12
  brand-line:     #1a1c22
  brand-red:      #ff1f3a
  brand-red-glow: #ff3855
  game-red:       #ff2e3e
  game-blue:      #1ea7ff
  game-yellow:    #ffd400
  game-green:     #1fd66a
  text-primary:   #ffffff
  text-muted:     rgba(255,255,255,.62)
  text-faint:     rgba(255,255,255,.38)

radius: sm 6 / md 10 / lg 14 / xl 20 / full 999
shadow: soft / glow-red / glow-quad-{r|b|y|g}
```

**Accessibility baseline (non-negotiable):**
- Contrast ≥ 4.5:1 for all text on each background tier
- All interactive elements ≥ 44×44 touch target
- Focus rings visible and themed
- Radix primitives wherever applicable
- `prefers-reduced-motion` honored across all motion layers

---

## 4. Data Model (Firestore)

### Collections

**`users/{uid}`** — created server-side after signup wizard completes; never written directly by the client.

```
{
  uid: string,
  email: string,
  emailVerified: boolean,
  firstName: string,
  lastName: string,
  displayName: string,
  displayNameKey: string,           // lowercase, used for uniqueness
  avatarSeed: string,               // = uid; deterministic color seed for initials tile
  role: 'player' | 'host',
  hostStatus: 'none' | 'pending' | 'approved' | 'denied',
  isAdmin: boolean,                 // bootstrapped via direct Firestore write for the founder; no in-app admin promotion in slice 1
  teamId: string | null,
  teamHistory: string[],
  stats: {
    gamesPlayed: number,
    gamesWon: number,
    totalCorrectAnswers: number,
    totalQuestionsAnswered: number,
    highestScore: number,
    currentWinStreak: number,
    longestWinStreak: number,
    lastPlayedAt: Timestamp | null,
    venues: VenueSummary[],         // [{ venueId, venueName, gamesAttended, lastVisitedAt }]; cap 50 in code
    favoriteVenueId: string | null, // computed server-side, not transactional
    favoriteTeammateUid: string | null,
  },
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**`displayNames/{displayNameKey}`** — uniqueness sentinel. Body: `{ uid }`. Created/deleted in the same transaction as profile creation/rename.

**`teams/{teamId}`**

```
{
  teamId: string,
  name: string,
  inviteCode: string,               // 6-char, regenerable by captain
  captainUid: string | null,        // null between captain departure and re-claim
  memberUids: string[],             // approved members only
  createdBy: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**`teams/{teamId}/joinRequests/{uid}`** — subcollection. Doc exists ⇒ user has a pending request.

**`hostApplications/{uid}`**

```
{
  uid: string,
  email: string,
  displayName: string,
  reason: string | null,
  status: 'pending' | 'approved' | 'denied',
  appliedAt: Timestamp,
  decidedAt: Timestamp | null,
  decidedBy: string | null,         // admin uid
}
```

### Indexes

- `users` by `displayNameKey`
- `users` by `hostStatus`
- `teams` by `inviteCode` (regenerate on collision)
- `hostApplications` by `status`

### Write authority

**Server-only (Admin SDK; rules deny client writes):**
- All fields on `users` except none — entire `users` doc is server-written
- `teams.captainUid`, `teams.memberUids`, team creation, team deletion
- All `joinRequests` mutations (create allowed for self, see below)
- All `hostApplications` mutations
- All `displayNames` sentinel mutations

**Client-allowed (with rules):**
- Create own `joinRequests/{ownUid}` doc with the request payload
- Read own `users/{uid}` doc
- Read own current `teams/{teamId}` doc
- Read `joinRequests` subcollection if you are the captain of that team
- Read another user's public profile fields via the `/api/profile/[displayName]` route (server filters fields)

### Public vs private profile fields

**Public** (returned by `GET /api/profile/[displayName]` to any signed-in user):
- `displayName`, `avatarSeed`, `createdAt`, role badge if `host`
- `teamId` (resolved to team name; team page link only if viewer is on the same team)
- `stats.gamesPlayed`, `stats.gamesWon`, `stats.longestWinStreak`, `stats.highestScore`

**Private** (only visible on owner's `/profile`):
- `firstName`, `lastName`, `email`
- All other `stats` fields (`totalCorrectAnswers`, `currentWinStreak`, `lastPlayedAt`, `venues`, `favoriteVenueId`, `favoriteTeammateUid`)
- `teamHistory`
- `hostStatus` (until approved)

Logged-out users redirect to `/login` when hitting `/u/{displayName}`. Public profiles are not SEO-indexed.

---

## 5. Auth & Session Flow

### Signup wizard

URL: `/signup?step=N`. Single page, animated transitions between steps. Back/forward navigation preserves state via URL params + ephemeral signup-session cookie.

**Step 1 · Account.** Email + password OR "Continue with Google."
**Step 2 · Identity.** First name, last name, display name. Live debounced (400ms) uniqueness check against `displayNames`. Checkmark / X icon morph.
**Step 3 · Role intent.** "I want to play trivia" (default) or "I want to host." Picking host adds an optional textarea (`reason`) describing venue, frequency, experience.
**Step 4 · Verify email.** Firebase email-link verification. Until `emailVerified: true`, user lands on a locked dashboard with a "Resend verification email" button. Team create/join is blocked pre-verification.

After Step 3, the client posts to `POST /api/auth/complete-signup`. The route handler:
- Verifies the Firebase ID token
- Runs a transaction creating `users/{uid}`, `displayNames/{key}`, and (if hosting) `hostApplications/{uid}` with `status: 'pending'`
- Fails atomically if the display name was claimed in the meantime

### Login

Email/password OR Google. After auth success, client calls `POST /api/auth/session` with the ID token; server sets `__session` HTTP-only cookie (Firebase-issued, 5-day expiry). Logout clears Firebase Auth client state and `POST /api/auth/logout` clears the cookie.

### Provider linking on email collision

Firebase project setting **"One account per email address"** is enabled.

**Case A:** User signed up with email/password on `joe@gmail.com`, then tries Google sign-in on the same email.
- Catch `auth/account-exists-with-different-credential`
- Show: *"joe@gmail.com is already registered with a password. Sign in with your password to add Google as a sign-in option."*
- On password sign-in success, call `linkWithCredential(pendingGoogleCred)`

**Case B:** User signed up with Google on `joe@gmail.com`, then tries email/password signup on the same email.
- Surface: *"Use Continue with Google to sign in to joe@gmail.com."*

A future Settings → "Linked sign-in methods" panel will let users add/remove methods themselves; out of slice 1.

### Route protection (three layers)

1. **`middleware.ts`** at root: cookie presence check; redirects unauthenticated users from `(app)` and `(admin)` routes to `/login`.
2. **`(app)/layout.tsx`** server component: reads session cookie, fetches `users/{uid}`, redirects unverified users to `/verify-email` (except for that page itself), provides user context.
3. **`(admin)/layout.tsx`**: verifies `isAdmin === true` server-side before rendering. `/host` page in `(app)` checks `hostStatus === 'approved'` server-side.

### Edge cases

- Orphan Auth account (user closed tab between Steps 1 and 3): on next login, server detects no `users/{uid}` doc and bounces them back into the wizard at Step 2.
- Display-name race: transaction on `displayNames` ensures only one writer wins; loser sees a "name was just taken" error and re-prompts.
- Google signup users still go through Steps 2 and 3 (need first/last/display/intent).
- Email verification expired: user can resend; rely on Firebase's built-in throttle.

---

## 6. Routing & Directory Structure

```
app/
├── (marketing)/                  # public
│   ├── page.tsx                  # landing
│   ├── about/page.tsx
│   └── layout.tsx                # marketing chrome, R3F bg
├── (auth)/                       # public; logged-in users redirect to /dashboard
│   ├── login/page.tsx
│   ├── signup/page.tsx           # ?step=1..4
│   ├── verify-email/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   └── layout.tsx                # split-screen: form left, brand right
├── (app)/                        # auth + email-verified
│   ├── dashboard/page.tsx        # role-aware home
│   ├── team/
│   │   ├── page.tsx              # current team or no-team state
│   │   ├── create/page.tsx
│   │   ├── join/page.tsx         # invite-code entry
│   │   ├── pending/page.tsx      # waiting for captain
│   │   └── settings/page.tsx     # captain-only
│   ├── profile/
│   │   ├── page.tsx              # private view + edit own profile
│   │   └── edit/page.tsx
│   ├── u/[displayName]/page.tsx  # public profile of another user
│   ├── host/page.tsx             # placeholder, host-only
│   └── layout.tsx                # app shell, page transitions
├── (admin)/                      # auth + isAdmin
│   ├── admin/
│   │   ├── page.tsx              # overview
│   │   ├── host-applications/page.tsx
│   │   ├── users/page.tsx
│   │   └── teams/page.tsx
│   └── layout.tsx                # calmer chrome
├── api/
│   ├── auth/{complete-signup,session,logout}/route.ts
│   ├── profile/{route.ts,check-display-name/route.ts,[displayName]/route.ts}
│   ├── teams/
│   │   ├── route.ts              # POST create
│   │   ├── join/route.ts         # POST { inviteCode }
│   │   └── [id]/{route.ts,leave/route.ts,transfer-captain/route.ts,regenerate-code/route.ts,requests/{route.ts,[uid]/route.ts}}
│   └── admin/{host-applications/[uid]/route.ts,users/[uid]/route.ts,teams/[id]/route.ts}
├── layout.tsx                    # root: fonts, theme provider, R3F canvas slot
├── globals.css
├── error.tsx
└── not-found.tsx

middleware.ts                     # cookie auth gate

components/{motion,three,ui,auth,team,admin,layout}/

lib/
├── firebase/{client.ts,admin.ts,session.ts}    # admin.ts is `import "server-only"`
├── auth/{guards.ts,provider-linking.ts}
├── teams/invite-code.ts
├── motion/{tokens.ts,reduced-motion.ts,tier.ts}
└── validation/schemas.ts                         # Zod schemas shared client + server

hooks/{useAuth,useUser,useTeam,useReducedMotion,useMotionTier}.ts

types/firestore.ts                                # one source of doc-shape truth
styles/theme.ts                                   # tokens, exported to Tailwind config
tests/{unit,integration,rules,e2e,fixtures}/
```

**Conventions:**
- Route groups isolate motion treatments per area
- Wizard URL strategy: single `/signup` route + `?step=N` query param
- No barrel files except `types/`
- Zod schemas imported by both forms and route handlers — single validation source

---

## 7. Component Architecture

### UI primitives (`components/ui/`)

Each is a thin themed wrapper, all support the `<Slot>` pattern and forward refs:

- `Button` — variants: `primary` (red glow), `secondary`, `ghost`, `danger`, `quad-{r|b|y|g}`. Spring squish on press, ripple on tap.
- `Input` — labeled, floating-label animation. `InputWithStatus` variant for live uniqueness checks.
- `Card` — `default`, `elevated`, `neon`, `quad-{color}`. Optional `interactive` flag.
- `Modal` / `Dialog` — Radix Dialog + grid-scrim backdrop. GSAP wipe at `full` tier; instant fade at `off`.
- `Badge` — `host`, `captain`, `pro`, `pending`.
- `Avatar` — initials tile, color seeded deterministically from `avatarSeed` (1 of 8 brand-safe gradients). Sizes `xs|sm|md|lg`.
- `Toast`, `Tabs`, `Dropdown`, `Tooltip`, `Skeleton`, `Spinner` — Radix-based.

### Motion primitives (`components/motion/`)

- `<MotionPage>` — wraps a route; owns enter/exit via `AnimatePresence` + GSAP scene wipe.
- `<KineticHeadline>` — display-font headline with letter-stagger entry; `glow="red|none"`.
- `<NeonGlow>` — animated outer glow on focus/hover.
- `<Reveal>` — IntersectionObserver-driven fade/slide-up.
- `<CountUp>` — animated number counters for stats.
- All consult `useMotionTier()` and downgrade appropriately.

### Three.js / R3F (`components/three/`)

- `<BrandScene>` — root canvas, lazy-loaded, rendered into root layout's `#scene-slot`. SSR-safe.
- `<GridFloor>` — perspective grid floor, drifts subtly. Static SVG fallback on `light` mobile.
- `<NeonOrb>` — soft volumetric light.
- `<TrivixLogoMark3D>` — extruded "T" mark, marketing hero only. Lazy.

Performance discipline:
- One `<Canvas>` per page max
- Auto-pause when `document.hidden` or `prefers-reduced-motion: reduce`
- All R3F bundles dynamic-imported, never in critical path
- `light` tier swaps to static SVG grid

### Domain components

- `auth/`: `WizardStep`, `WizardProgress`, `GoogleButton`, `EmailVerificationBanner`, `LinkedProvidersNotice`
- `team/`: `TeamHeader`, `InviteCodeChip` (mono, click-to-copy + toast), `MembersList`, `MemberRow`, `JoinRequestPanel`, `BecomeCaptainButton`, `TransferCaptainModal`, `TeamEmptyState`
- `admin/`: `AdminTable` (sortable, searchable), `HostApplicationCard`, `UserActionMenu`, `TeamActionMenu`, `ConfirmDestructive` (typed-confirmation modal for deletes)
- `layout/`: `AppShell`, `TopNav`, `MobileNav` (drawer), `RoleBadge`, `UserMenu`

### State strategy

- Auth state → `useAuth` (Firebase listener, root context)
- Current user Firestore doc → `useUser` (real-time `onSnapshot`)
- Current team + join requests → `useTeam` (real-time, conditionally subscribed)
- Forms → React Hook Form + Zod
- No Redux / Zustand in slice 1

---

## 8. Motion System

### Three runtime tiers

`useMotionTier()` returns `'full' | 'light' | 'off'`, computed once per session via `lib/motion/tier.ts`:

- `prefers-reduced-motion: reduce` → `off`
- `(pointer: coarse)` OR `navigator.deviceMemory < 4` OR `navigator.hardwareConcurrency < 4` → `light`
- Battery API `level < 0.2 && !charging` → `light`
- Otherwise → `full`

### Token system (`lib/motion/tokens.ts`)

```
durations:  instant 0 / fast 150 / base 280 / slow 480 / scene 800
easings:    standard, emphasized, springy, decel, accel
springs:    soft, snappy, bouncy, heavy
stagger:    tight 30ms / base 60ms / loose 120ms
```

No magic numbers in components.

### Four motion layers (composed by `MotionPage`)

1. **Page transitions (GSAP)** — diagonal grid-mask wipe in brand red. `light`: simple fade. `off`: instant.
2. **Component motion (Framer Motion)** — entry/exit, hover, press, layout. Spring-based. `off`: instant.
3. **Ambient WebGL (R3F)** — `BrandScene` continuous; auto-paused on hidden tab or `off`. `light`: 30 FPS cap.
4. **Micro-feedback (Lottie)** — empty states, success ticks, loaders. Auto-pause on `off`.

### Choreography rules

- One headline animation per page max
- Stagger is hierarchical: parent enters → wait `stagger.tight` → children enter together. No nested staggers.
- Page transitions own the camera; component animations don't fight them
- Glow pulses tied to focus/hover only — no idle-pulsing on every neon element
- Confetti / screen shake / scene flash reserved for game events. In slice 1: only a small confetti burst on team-creation success and host-approval.

### Slice 1 motion moments

| Moment | Treatment |
|---|---|
| Marketing hero load | R3F BrandScene fade-in, KineticHeadline letter-stagger, CTA squish-in |
| Login form | Split-screen reveal: form slides from left, brand panel from right |
| Signup wizard step change | GSAP wipe, progress bar morphs |
| Display-name uniqueness check | Icon morph (spinner → check or X) with color glow |
| Email verification banner | Pulses red until verified; green confetti micro-burst on verify |
| Dashboard land | Cards stagger-in; role badge pop-bounce |
| Team creation success | Brand-red confetti burst + scene flash + invite-code letter-stagger reveal |
| Captain promotion | Avatar gets crown badge that scales-in with bounce + glow ring |
| Join-request approval (captain) | Row slides out, avatar floats up to MembersList, list re-flows with `layout` |
| Admin approve host | Application row slides out + green flash + toast |
| Page navigation | GSAP wipe |
| Reduced-motion fallback | All of the above → instant fade or no transition |

### Performance budget

- `(app)` initial JS ≤ 200KB gzipped (target). R3F + drei dynamic-imported with `BrandScene`.
- LCP ≤ 2.5s on a mid-range Android over 4G
- 60fps desktop, 30fps mobile minimum during scene transitions
- Lighthouse Performance ≥ 85 marketing, ≥ 75 app

---

## 9. Testing Strategy

**Unit (Vitest):** Pure functions in `lib/` — invite-code generator + collision check, display-name normalization, motion-tier detection, role helpers, Zod schemas, avatar color seeding. Sibling `*.test.ts` for each.

**Integration (Vitest + Firebase Emulator Suite):** Transactional flows where data corruption hides:
- Signup transaction (user + displayName + optional hostApplication, atomic)
- Display-name race (two concurrent signups, only one wins)
- Join team flow (request → approve → memberUids + user.teamId set, request deleted, atomic)
- Captain transfer (only current captain can call; new captain must be a member)
- Leave team (captain-leave clears captainUid, user.teamId nulled)
- Admin host approval (status, role, hostStatus all flip atomic)
- Admin delete team (cascades user.teamId clears, joinRequests subcollection deletes)
- Provider linking on email collision (mocked Firebase auth error path)

Each `app/api/` route handler gets at least one happy-path + one auth-rejection + one validation-rejection test.

**Security rules (`@firebase/rules-unit-testing`):** Defense-in-depth. Per collection, prove:
- Anonymous read/write denied where it should be
- A user cannot flip own `isAdmin`, `role`, `teamId`, `stats`, or any server-only field
- A user can read own user doc; cannot read another user's user doc directly (public profile goes through API)
- Captain can read pending join requests on own team; non-captains cannot
- Only admin can read all of `hostApplications`, `users`, `teams`

**E2E (Playwright + axe-core):** Critical journeys against local emulators in CI:
- Signup → email verify → create team → see invite code
- Player joins via invite code → captain sees request → approves → player sees team
- Captain transfers role → old captain becomes regular member → new captain sees admin actions
- Host application → admin approves → user sees `/host` placeholder + Host badge
- Admin deletes a team → all members' `teamId` cleared
- Login email/password works; login Google works (Auth emulator mock provider)
- Provider linking: email/password signup → Google login on same email → linking flow completes
- Reduced-motion: emulate `prefers-reduced-motion: reduce` → assert no `transform`/`opacity` transitions on key components

Axe runs as part of every E2E test; serious/critical violations fail the suite.

**Performance (Lighthouse CI):** Runs on `main` builds. Soft-fails (PR comment, non-blocking) when Lighthouse Perf < 85 marketing, < 75 app, or LCP > 2.5s.

**Test fixtures:** `tests/fixtures/seed.ts` seeds the emulator with known UIDs (`admin`, `pendingHost`, `approvedHost`, `captain`, `player`, `teamlessPlayer`). Same seeder used by `npm run dev:seed` so manual testing matches CI.

**CI pipeline:**
1. Lint + typecheck
2. Unit
3. Spin up Firebase emulators
4. Integration + rules tests
5. Build Next.js
6. Playwright E2E + axe
7. Lighthouse CI

Steps 1–6 pass → deploy preview. `main` deploys to production.

**Out of slice 1:** Visual regression (Percy/Chromatic), load testing, cross-browser matrix beyond Playwright defaults (Chromium + Firefox + WebKit).

---

## 10. Open Items / Deferred to Later Slices

These are intentionally deferred but listed so they're not lost:

- **Slice 2 (likely):** Curated avatar chooser; settings-page motion toggle; "Linked sign-in methods" UI; user-controlled display-name change (one per 30 days, say); team description / public-team toggle / browse.
- **Slice 3 (live games — biggest):** Venue model, game scheduling, real-time question delivery, scoring, leaderboards, host live-controls, audience interactions, ambient audio cues.
- **Slice N:** Apple sign-in, MFA, account merge across emails, audit log, role-tiered admins, impersonation, full venue/event analytics.

---

## 11. Bootstrap

The first admin is created by manually writing `isAdmin: true` to the founder's `users/{uid}` document in the Firebase console (or via a one-off seed script run against production with the Admin SDK). There is no in-app admin-promotion UI in slice 1 — only one admin exists, and adding more admins is deferred to a later slice when role-tiered admin permissions also arrive.

The Firebase project must be configured with **"One account per email address"** enabled. Auth providers enabled: Email/Password, Google. Firestore rules and indexes are committed in the repo (`firestore.rules`, `firestore.indexes.json`) and deployed via `firebase deploy --only firestore`.

## 12. Success Criteria for Slice 1

A user can:
1. Sign up with email/password or Google, verify email, complete profile wizard with a unique display name.
2. As a player, create a team or join one via invite code.
3. As a captain, see pending join requests, approve/deny, transfer the captain role, regenerate the invite code, leave or disband the team.
4. As a member, leave the team.
5. View own private profile and another user's public profile.
6. Apply to be a host at signup, see "pending" status, become an approved host after admin action, see the `/host` placeholder.

An admin can:
1. View pending host applications, approve/deny.
2. View all users, revoke pro status, delete users.
3. View all teams, delete teams (cascading correctly).

Cross-cutting:
1. Email verification gates team create/join.
2. Provider linking handles the email-collision case in both directions.
3. All motion respects `prefers-reduced-motion`; mobile/low-power devices get the `light` tier; desktop gets `full`.
4. Lighthouse Perf ≥ 85 on marketing, ≥ 75 on app pages.
5. CI runs the full pipeline (unit + integration + rules + E2E + axe + Lighthouse) green on every PR before merge.
