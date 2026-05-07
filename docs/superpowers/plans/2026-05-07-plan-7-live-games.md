# Plan 7 — Live Game Session (Outline)

> Tight outline. Per-task detail expanded during execution.
> Spec doesn't define this slice; model is designed here.

## Goal

Hosts can run a live trivia night manually: create a session (pick venue + question set), share a 6-char session code, players join, host advances through questions one at a time, players submit answers, host ends the game and stats write back to every player's profile.

This is the **manual / non-realtime** version. Players poll for updates instead of subscribing via `onSnapshot`. The data model is the same one Plan 8 will subscribe to, so we don't paint ourselves into a corner.

## Out of scope (deferred to Plan 8)

- Real-time `onSnapshot` for host + player views (polling instead)
- Server-side question timers (host clicks "next" when ready)
- Big-screen "presenter" view distinct from host phone view
- Team-level scoring (slice 7 scores individuals only)
- Animated reveals, confetti
- QR-code join links (manual code entry only)
- Pause/resume game state
- Game history page
- Per-session player cap

## Prerequisites (already done)

- Approved-host gate via `requireApprovedHost()` (Plan 5)
- Venues collection (Plan 5)
- Question sets collection (Plan 6)
- 6-char invite-code generator + alphabet (Plan 3, reused for session codes)
- `users.stats` shape with `gamesPlayed`, `gamesWon`, etc. (Plan 2)

---

## Task list

Numbering picks up from Plan 6 (which ended at Task 147).

### Foundation

- **148. Schemas + types** — `createGameSessionSchema` (`{venueId, questionSetId}`), `joinGameSessionSchema` (`{sessionCode}`), `submitAnswerSchema` (`{questionIndex, choiceIndex}`). `GameSessionDoc`, `GameSessionPlayer`, `SerializedGameSession` types. Status enum: `"lobby" | "active" | "ended"`.
- **149. Firestore rules** — `gameSessions/{sessionId}`: host or any player in `players` map can read; admin reads all; all writes server-only.
- **150. Session code generator** — thin wrapper around the existing invite-code generator that retries against `gameSessions` instead of `teams`.

### Server routes

- **151. `POST /api/games`** — host create. Validates the host owns the venue + the question set, snapshots the questions array onto the session, generates a unique 6-char code, stores `venueNameSnapshot` per Plan 5 D2.
- **152. `POST /api/games/join`** — player join (any signed-in user). Looks up session by code, must be in `lobby`, adds caller to `players` map. Idempotent.
- **153. `GET /api/games/[id]`** — host or player reads current state (status, currentQuestionIndex, current question payload only — never future questions, never `correctIndex` until the question is over).
- **154. `POST /api/games/[id]/start`** — host-only. `lobby` → `active`, sets `currentQuestionIndex = 0`, `startedAt`.
- **155. `POST /api/games/[id]/advance`** — host-only. `active` only. Reveals correct answer for current index (sets `revealedIndex = currentQuestionIndex`), then bumps `currentQuestionIndex`. If past last question, transitions to `ended` and triggers stats writeback (Task 157 logic shared).
- **156. `POST /api/games/[id]/answer`** — player submits answer. `active` only. Player must already be in `players` map. `questionIndex` must equal `currentQuestionIndex` and the player must not have answered this index yet. Records `{choiceIndex, correct, points, answeredAt}` in their `answers[questionIndex]`; bumps their `score` by `points` if correct.
- **157. `POST /api/games/[id]/end`** — host-only force-end. Atomically: status → `ended`, `endedAt = now`, stats writeback to every player.
- **158. `DELETE /api/games/[id]`** — host cancels. Only allowed in `lobby` (no stats touched).
- **159. `GET /api/admin/games`** — admin list. Slim payload with status, host, venue, player count.

### Pages

- **160. `(app)/host/games/new/page.tsx`** — venue + question set picker; on submit, creates session and redirects to `/host/games/[id]`.
- **161. `(app)/host/games/[id]/page.tsx`** — host dashboard. Shows session code, player list, current question + correct answer (host privileges), Start / Next question / End game buttons. Polls every 3s.
- **162. `(app)/play/page.tsx`** + **`(app)/play/[id]/page.tsx`** — player join via code + live play view. Shows current question (no correct answer until reveal), choice buttons, my score. Polls every 3s.

### Stats writeback

- **163. `lib/games/finalize.ts`** — pure-ish helper that takes a session doc + the `users` collection, transactionally updates each player's `stats` per spec section 4: `gamesPlayed++`, `totalCorrectAnswers += correct count`, `totalQuestionsAnswered += answer count`, `highestScore = max(prev, sessionScore)`, `lastPlayedAt = now`, plus venues array upsert. Winner (single highest scorer; ties = no winner) gets `gamesWon++`, `currentWinStreak++`, `longestWinStreak = max(prev, currentWinStreak)`. Losers reset `currentWinStreak = 0`.

### Tests

- **164. Rules tests** — host reads own; player reads sessions they joined; admin reads all; nobody writes directly. ~5 cases.
- **165. Route integration tests** — happy paths for create / join / start / advance / answer / end + 401/403/404/409 cases. ~20 cases.
- **166. Stats writeback test** — full game lifecycle: create, two players join, start, both answer some questions, end. Verify each player's `stats` updated correctly, winner has streak.
- **167. E2E middleware redirects** for `/host/games/*` and `/play/*`.

### Final

- **168. Verification pass** — format, lint, typecheck, unit, integration, E2E, build. Tag `plan-7-complete`.

---

## Acceptance criteria

1. Approved host can create a game session at one of their own venues using one of their own question sets.
2. Session code is unique 6-char (no `0/O/1/I/L`).
3. Players who enter the code while session is in `lobby` are added.
4. Host can start the game; players see the first question.
5. Player can submit one answer per question; correct answers add the question's `points` to their score.
6. Host clicks "Next question" to advance; correct answer is revealed for that index; advancing past the last question ends the game.
7. Host can force-end at any time during `active`.
8. On end, every player's stats update: `gamesPlayed++`, totals tracked, highestScore updates, winner gets `gamesWon++` and streak math, losers reset `currentWinStreak`, venues array upserted with `gamesAttended++`.
9. Firestore rules enforce: only host + players + admin read; all writes server-only.
10. Cancel deletes the session only if still in `lobby`.
11. All test layers green; CI green.

---

## Decisions (resolved 2026-05-07)

- **D1.** Session codes use the same 6-char unambiguous alphabet as team invite codes; generator reused.
- **D2.** Manual code entry only; no QR.
- **D3.** Score = sum of `points` for correct answers. No time bonus.
- **D4.** Players poll `GET /api/games/[id]` every 3s.
- **D5.** Anyone signed in + email-verified can join with the code (existing `(app)` layout guard handles auth).
- **D6.** Unique top scorer wins; ties → no winner (no `gamesWon++`).
- **D7.** When host advances past a question, the correct answer becomes visible to players.
- **D8.** Tab close: rejoin by re-entering the code (join is idempotent). No auto re-discovery in this slice.

---

## Done

When all 21 tasks land, all acceptance criteria pass, and `git tag plan-7-complete` is pushed. Plan 8 (real-time + timers + presenter view) builds on this exact data model.
