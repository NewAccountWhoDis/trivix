# Plan 2 — Auth & Profiles (Outline)

> Tight outline. Per-step detail will be expanded task-by-task during execution.
> Source of truth: `docs/superpowers/specs/2026-05-04-trivix-foundation-design.md`, sections 4–6.

## Goal

Ship signup wizard, login, session cookies, route protection, profile pages, and the Firestore data model + rules for `users`, `displayNames`, and `hostApplications`. End state: a real human can sign up (email/password or Google), verify email, see their profile, edit it, and view another user's public profile. Unverified users land on a locked dashboard.

## Out of scope (deferred to Plan 3+)

- Teams (`teams`, `joinRequests`) — full collection arrives in Plan 3
- Admin pages and host-application approval UI — Plan 4
- Linked sign-in methods settings panel
- Apple sign-in, magic link, MFA

## Prerequisites (already done)

- Plan 1 complete; Firebase project `trivix-dev` provisioned
- Firestore default-deny rules deployed
- Auth providers Email/Password + Google enabled, "One account per email address" on
- Netlify env vars set; production deploy green

---

## Task list

Numbering picks up from Plan 1 (which ended at Task 34) for continuity.

### Foundation

- **35. Zod schemas** — `lib/validation/schemas.ts` for signup, profile edit, display-name check. Shared client+server.
- **36. Firestore types** — populate `types/firestore.ts` with `User`, `DisplayName`, `HostApplication` doc shapes.
- **37. Firestore rules v2** — replace default-deny with: read-own-user, read-own-host-app, deny everything else (server-only writes). Add unit tests against rules emulator.
- **38. ~~Composite indexes~~** — verified no-op. Spec §4 indexes are all single-field; Firestore auto-creates them. First composite index lands in Plan 3.

### Auth plumbing

- **39. Firebase client auth helpers** — `lib/auth/client.ts`: `signUpWithEmail`, `signInWithEmail`, `signInWithGoogle`, `signOut`, `sendVerificationEmail`. Wraps the Firebase Web SDK.
- **40. Provider linking** — `lib/auth/provider-linking.ts`: handles `auth/account-exists-with-different-credential` Cases A and B from spec §5.
- **41. Session cookie routes** — flesh out `lib/firebase/session.ts`; implement `POST /api/auth/session` (mint `__session`), `POST /api/auth/logout` (clear it).
- **42. `complete-signup` route** — `POST /api/auth/complete-signup`: verifies ID token, runs transaction creating `users/{uid}` + `displayNames/{key}` (+ `hostApplications/{uid}` if `host` intent), atomic rollback on display-name race.
- **43. Display-name uniqueness route** — `POST /api/profile/check-display-name` for the wizard's debounced live check.
- **44. Middleware cookie gate** — `middleware.ts` at root: redirects unauthenticated users from `(app)`/`(admin)` to `/login`.
- **45. `(app)/layout.tsx` server component** — reads `__session`, fetches `users/{uid}`, redirects unverified to `/verify-email`, provides UserContext.
- **46. `useAuth` + `useUser` hooks** — client-side state surface for components.

### Auth pages

- **47. `(auth)/layout.tsx`** — split-screen chrome (form left, brand right).
- **48. `(auth)/login/page.tsx`** — email/password + Google buttons, error states.
- **49. Signup wizard scaffold** — `(auth)/signup/page.tsx` with `?step=1..4` URL strategy, animated step transitions, ephemeral wizard cookie for cross-step state.
- **50. Wizard Step 1 (Account)** — email/password form OR Google button.
- **51. Wizard Step 2 (Identity)** — first/last/displayName with debounced uniqueness check + checkmark/X morph.
- **52. Wizard Step 3 (Role intent)** — player vs host radio + optional reason textarea, posts to `complete-signup`.
- **53. Wizard Step 4 (Verify email)** — instructions + "Resend verification email" button using Firebase throttle.
- **54. Forgot/reset password pages** — Firebase password-reset email flow.
- **55. Orphan-account recovery** — login flow detects no `users/{uid}` doc → bounces to `/signup?step=2`.

### Profile pages

- **56. `(app)/profile/page.tsx`** — owner's view, all private fields, edit affordance.
- **57. `(app)/profile/edit/page.tsx`** — edit form (firstName, lastName, displayName with uniqueness check on rename). Posts to `PATCH /api/profile`.
- **58. `PATCH /api/profile`** — server route; rename runs displayName transaction (delete old sentinel, create new).
- **59. `GET /api/profile/[displayName]`** — returns public-fields-only payload per spec §4.
- **60. `(app)/u/[displayName]/page.tsx`** — public profile view; signed-out viewers redirected to `/login`; `noindex` meta.
- **61. `(app)/dashboard/page.tsx` (locked variant)** — minimal "verify your email" landing for unverified users; role-aware shell for verified.
- **62. `(app)/host/page.tsx` placeholder** — server-checks `hostStatus === 'approved'`, otherwise 403.

### Tests

- **63. Seed fixtures** — `tests/fixtures/seed.ts` populates emulator with admin, pendingHost, approvedHost, captain (stub), player, teamlessPlayer.
- **64. Rules tests** — `tests/integration/rules/users.test.ts`, `displayNames.test.ts`, `hostApplications.test.ts`.
- **65. Auth route integration tests** — emulator-backed tests for `complete-signup` (happy path, displayName race, host intent), `session`, `logout`.
- **66. E2E: signup wizard happy path** — Playwright; email/password through all 4 steps, asserts `users/{uid}` doc exists.
- **67. E2E: login + edit profile** — sign in seeded user, rename displayName, assert public profile resolves under new URL.
- **68. E2E: provider linking Case A** — email user attempts Google sign-in, sees prompt, links successfully.
- **69. Final verification pass** — format, lint, typecheck, unit, integration, E2E, build, Lighthouse local. Tag `plan-2-complete`.

---

## Acceptance criteria (definition of done)

1. New visitor can sign up with email/password through all 4 wizard steps, verify email, land on dashboard.
2. New visitor can sign up with Google, still completes Steps 2–3, lands on dashboard.
3. Existing user can log in, log out, recover password.
4. Provider-linking Cases A and B both work end-to-end.
5. Unauthenticated requests to `(app)`/`(admin)` redirect to `/login`.
6. Unverified users only see `/verify-email`.
7. Owner can view + edit their profile; rename is atomic.
8. Public profile at `/u/{displayName}` shows only spec-§4 public fields; signed-out viewers redirect.
9. Firestore rules deny every direct client write to `users`, `displayNames`, `hostApplications`.
10. All test layers green; Lighthouse perf ≥ 0.85, a11y ≥ 0.9 on `/login`, `/signup`, `/profile`.

---

## Decisions (resolved 2026-05-06)

- **D1.** Email verification = stock Firebase `sendEmailVerification` (link-based, user clicks link in inbox).
- **D2.** Session cookies = Firebase session cookies, 5-day expiry, `__session` HTTP-only.
- **D3.** Display-name collision UX = X icon + inline message **"username isn't available"**. No auto-suggest in slice 1.
- **D4.** Avatar gradient pool = 8 gradients from `lib/avatar/seed.ts` (red, blue, green, gold, magenta, cyan, violet, amber). Verified.

---

## Done

When all 69 tasks land on `main`, all acceptance criteria pass, and `git tag plan-2-complete` is pushed. Plan 3 (Teams) builds on this.
