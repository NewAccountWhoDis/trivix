# Plan 10 — Presenter View + QR Join + Animated Reveals (Outline)

> Tight outline. Per-task detail expanded during execution.

## Goal

Make the live game experience feel like a real trivia night, not a phone app pointed at a TV. Three things:

1. **Presenter view** at `/host/games/[id]/present` — projector/TV-optimized, huge type, no host controls, autoplays the session content. Host still controls advance from their phone via the existing dashboard.
2. **QR-code join** — the lobby shows a QR code alongside the 6-character code; players scan and land directly in the game with one tap.
3. **Animated reveals** — when the host advances past a question, the correct answer flips green with a small stagger across choices. Honors `prefers-reduced-motion` and the existing motion-tier system.

End state: a host opens the dashboard on their phone, the presenter view on the venue's TV, and runs a night where players scan a QR with their phone and play in real time.

## Out of scope (deferred)

- Auto-advance on timer expiry (still needs Cloud Functions)
- Confetti / particle effects on game end
- Presenter view layout customization
- QR code branding / logo embed
- Wakelock keep-alive on host phone (presenter only — phone hosts can plug in)

## Prerequisites (already done)

- Real-time `useGameSession` hook (Plan 8)
- Per-question deadline + Countdown (Plan 8)
- Team aggregates (Plan 9)
- Motion-tier infra (`lib/motion/tokens.ts`, `lib/motion/tier.ts`, Plan 1)

---

## Task list

Numbering picks up from Plan 9 (which ended at Task 199).

### Foundation

- **200. QR code component** — install `qrcode` dep; `components/games/QrCode.tsx` renders an SVG QR for any URL. Reusable, no app-specific logic.
- **201. `/play?code=ABCD23` deep-link** — `(app)/play/page.tsx` reads `?code=` query param, validates, auto-submits join. Falls back to manual entry on validation error.

### Presenter view

- **202. `(app)/host/games/[id]/present/page.tsx`** — server component, host-only check (same as `/host/games/[id]`). Wraps `PresenterView` client component.
- **203. `PresenterView` component** — uses `useGameSession`. Renders state-aware:
  - **lobby**: huge session code + QR code centered, "Join with this code" caption, live player count
  - **active**: question prompt at the top (massive), 4 choices in a 2x2 grid, countdown ring or large numeral, correct answer reveal styled
  - **ended**: final scoreboard (top 5 teams + top 5 players), winner highlighted
- **204. Lobby QR on host dashboard** — `HostGameDashboard` shows a QR code in lobby state next to the session code (smaller than presenter view's; for hosts who present on their phone).

### Animated reveals

- **205. `AnimatedChoice` component** — wraps a choice in a CSS-transition flip. When `correctIndex` changes from `null` → real value, choices animate: correct flips to green with a 100ms delay, others fade slightly. Honors `prefers-reduced-motion` (instant transition).
- **206. Wire animations** — replace the choice rendering in `PlayerLiveView`, `HostGameDashboard`, `PresenterView` with `AnimatedChoice`.

### Wakelock + polish

- **207. `useWakeLock()` hook** — browser Wake Lock API; activated on `PresenterView` while game is `active`. Silently no-ops on Safari/unsupported browsers.
- **208. Presenter typography pass** — ensure `font-display` scales to comfortable reading at 10ft+; max question prompt size, choice grid, countdown sizing.

### Tests

- **209. Unit: QR URL builder** — pure function that takes session code + origin, returns a join URL.
- **210. E2E: `/host/games/[id]/present` middleware redirect** + `/play?code=...` parse logic.

### Final

- **211. Verification pass** — format, lint, typecheck, unit, integration, E2E, build. Tag `plan-10-complete`.

---

## Acceptance criteria

1. Host opens `/host/games/[id]/present` on a TV; sees session code + QR code centered in lobby state at large size readable from across a room.
2. A QR code in the lobby (host dashboard or presenter) scanned from any phone deep-links to `/play?code=<code>` and auto-joins the game.
3. When the host advances past a question, all four choices animate to their reveal state with a small stagger (correct = green, others = neutral). Reduced-motion users see instant transitions.
4. While a game is `active` and presenter view is open, the screen does not sleep (wakelock).
5. Presenter view is host-only (non-host hitting that URL redirects to `/host`).
6. All Plan 7–9 acceptance criteria still pass — game model unchanged.
7. CI green.

---

## Decisions to lock in before execution

- **D1.** QR encodes a full URL (`https://triviax.netlify.app/play?code=ABCD23`) so it works from any QR scanner? *Recommend: yes. Short-form `trivix://` deep-links require app installation; we're a web app.*
- **D2.** QR library: `qrcode` npm package (small, SVG output) vs pure JS implementation? *Recommend: `qrcode`. Battle-tested, ~30kb gzipped, generates SVG so we get crisp scaling.*
- **D3.** `/play?code=X` auto-submits join, or just pre-fills the input? *Recommend: auto-submit. The whole point of QR is one-tap.*
- **D4.** Presenter view auth: same `hostUid === session.uid` check as the dashboard? *Recommend: yes. No co-host concept yet.*
- **D5.** Animation library: lean on CSS transitions/keyframes vs GSAP (already in deps)? *Recommend: CSS for the choice reveal. GSAP is overkill for a 200ms transition; keep the bundle small. GSAP stays available for future big motion (presenter scene wipes etc.).*
- **D6.** Honor `prefers-reduced-motion` and motion tier (`full | light | off`) on animations? *Recommend: yes — Plan 1 already wired the system; reuse it.*
- **D7.** Wakelock: noop silently on unsupported browsers (Safari pre-16.4, all Firefox)? *Recommend: yes; not worth the polyfill complexity.*

---

## Done

When all 12 tasks land, all acceptance criteria pass, and `git tag plan-10-complete` is pushed.
