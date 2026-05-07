# Plan 8 — Real-time + Per-Question Timers (Outline)

> Tight outline. Per-task detail expanded during execution.

## Goal

Replace Plan 7's 3-second polling with Firestore `onSnapshot` on both host and player views, and add a per-question deadline that the server enforces (late answers rejected) and the UI shows as a countdown. Host still clicks "Next" — automatic advance lands in a later slice once we have a scheduler.

End state: players see scores + question changes within ~100ms of host actions, see a live countdown, and can't slip an answer past the deadline.

## Out of scope (deferred)

- Automatic advance when timer expires (needs Cloud Functions / scheduler)
- Big-screen presenter view (Plan 9 candidate)
- Animated reveals / confetti
- Per-question custom timer values (slice ships fixed default)
- Pause / resume

## Prerequisites (already done)

- Game session model + manual host flow + scoring (Plan 7)
- Firebase client SDK already wired with lazy init (Plans 1 + 4)
- Firestore rules pattern for "host or players in map can read" (Plan 7)

---

## Task list

Numbering picks up from Plan 7 (which ended at Task 168).

### Data model split (security prerequisite for onSnapshot)

Today the `gameSessions` doc contains the full questions array including
`correctIndex`. The Plan 7 `GET /api/games/[id]` route sanitizes the
response per role. Once players subscribe via `onSnapshot`, that
sanitization layer disappears — Firestore rules grant or deny whole
documents, so a player snapshot would expose every correct answer and
every future-question prompt.

Solution: split into **two collections**.

- **`gameSessions/{id}`** — player-safe state. Holds: `status`,
  `currentQuestionIndex`, `revealedIndex`, `sessionCode`, `players` map,
  `currentQuestionDeadline`, and a sanitized `questions` array with
  `correctIndex` set to `null` until that question is revealed (then the
  server overwrites it with the real value).
- **`gameSessionKeys/{id}`** — host/admin-only. Full question array
  including every `correctIndex`. Server-only writes; host + admin reads.

- **169. Split schemas + types** — `SanitizedQuestion` (with
  `correctIndex: number | null`); `GameSessionDoc` adopts it; new
  `GameSessionKeyDoc` type; `currentQuestionDeadline` field added.
- **170. Firestore rules** — `gameSessionKeys/{id}`: host (`hostUid` on
  the matching `gameSessions/{id}` doc) or admin reads; writes
  server-only. `gameSessions` rules unchanged.
- **171. Migrate `POST /api/games`** — write both docs. Strip
  `correctIndex` from the gameSessions snapshot; full keys go to
  `gameSessionKeys`.
- **172. Migrate `/advance`** — when revealing a question, copy
  `correctIndex` from `gameSessionKeys` into the `gameSessions` doc's
  questions array at the revealed index.
- **173. Migrate `/answer`** — score by reading `gameSessionKeys`
  (server-side). No change visible to the client.
- **174. Migrate `/end` + `finalize.ts`** — read keys from
  `gameSessionKeys`. Delete the keys doc after finalization (no longer
  needed; saves storage).
- **175. Strip the role-based response sanitization in `GET
  /api/games/[id]`** — the doc is already player-safe. Host still gets
  full session via the same route, but for the answer key the host UI
  reads `gameSessionKeys` directly via `onSnapshot`.

### Real-time client (replaces polling)

- **176. `useGameSession(sessionId)` hook** — wraps `onSnapshot` on
  `gameSessions/{id}` plus a separate read of `gameSessionKeys/{id}`
  (host only). Exposes `{ session, answerKey, loading, error }`. Cleans
  up listeners on unmount.
- **177. Refactor `HostGameDashboard`** to consume the hook. Drop the
  3-second polling. Host UI shows real-time player scores ticking up
  as players answer.
- **178. Refactor `PlayerLiveView`** to consume the hook. Drop the
  3-second polling. Player sees their score change instantly, sees the
  question change instantly when host advances.

### Per-question timer

- **179. Add timer config** — `lib/games/config.ts` exports
  `QUESTION_DURATION_MS = 30_000`. Used by start + advance to compute
  `currentQuestionDeadline = serverTimestamp() + 30s`.
- **180. Server-side answer cutoff** — `/answer` route rejects with
  409 if `Date.now() > currentQuestionDeadline.toMillis()`. Tested
  with a deterministic clock injection.
- **181. Countdown UI on host + player views** — small `<Countdown>`
  client component takes a deadline ms; renders seconds remaining;
  visually warns at < 5s; shows "time's up" when expired.
- **182. Reveal-on-deadline UX** — when timer expires (client clock
  hits deadline), choices become disabled. Host's "Next question"
  button gains a visual nudge once timer has passed.

### Tests

- **183. Rules tests** — `gameSessionKeys` host+admin reads; players
  cannot read; no client writes. ~4 cases.
- **184. Integration tests** — split-collection invariants: create
  populates both docs; advance copies correctIndex on reveal; answer
  reads keys; end deletes keys doc; answer rejected after deadline.
  ~8 new cases on top of Plan 7's existing 24.
- **185. Timer enforcement test** — submit answer twice: once before
  deadline (succeeds), once after (409). Uses a backdated deadline to
  avoid real waits.

### Final

- **186. Verification pass** — format, lint, typecheck, unit,
  integration, full E2E, build. Tag `plan-8-complete`.

---

## Acceptance criteria

1. Player view updates within ~1s of host advancing (no polling).
2. Host view updates player scores in real time as players submit answers.
3. Players never see future question prompts via Firestore reads.
4. Players never see correct-index for unrevealed questions via Firestore reads.
5. Server rejects an answer submitted after `currentQuestionDeadline`.
6. UI shows a per-question countdown that warns under 5 seconds.
7. After game ends, `gameSessionKeys/{id}` is deleted.
8. Existing Plan 7 acceptance criteria still pass.
9. All test layers green; CI green.

---

## Decisions to lock in before execution

- **D1.** Split `gameSessions` + `gameSessionKeys` collections (vs
  trying to filter fields some other way)? *Recommend: split. Firestore
  rules grant whole docs; field-level filtering would mean keeping the
  API in front of every read, which defeats the point of `onSnapshot`.*
- **D2.** Default timer length: 30s per question (regardless of
  difficulty)? *Recommend: 30s. Configurable per question is a
  follow-up.*
- **D3.** Timer storage: absolute `currentQuestionDeadline: Timestamp`
  on the gameSessions doc (vs a duration field + question-started
  timestamp)? *Recommend: absolute deadline. Clients render directly
  with no extra math; server cutoff is one comparison.*
- **D4.** Late-answer enforcement: server rejects with 409 (vs accepts
  but flags `late: true`)? *Recommend: 409. Cleaner UX; no late-credit
  ambiguity.*
- **D5.** Auto-advance on timer expiry: punted to a later slice (needs
  scheduler). Host still clicks "Next." UI surfaces a visual cue when
  the timer is up. *Recommend: yes, defer.*
- **D6.** Clock skew: client uses `currentQuestionDeadline.toMillis()
  - now()` to render countdown. ~1s skew is fine; no NTP plumbing.
  *Recommend: yes.*
- **D7.** Host can read `gameSessionKeys` to see correct answers for
  upcoming questions? *Recommend: yes. Hosts already snapshot their
  question set when starting; this just makes the answer key directly
  visible without round-tripping through the sanitized API.*

---

## Done

When all 18 tasks land, all acceptance criteria pass, and `git tag
plan-8-complete` is pushed. Plan 9 candidates: presenter view,
auto-advance via Cloud Functions, animated reveals.
