# Plan 9 — Team Integration with Live Games (Outline)

> Tight outline. Per-task detail expanded during execution.

## Goal

Close the loop the spec opens with "build a team, host a night." Right now Plan 3's teams sit unused during a game — players join sessions as individuals. This slice has players play **as their team**, with team-level scores live during the game, team winners on game-end, and `/team` showing recent games + a win-loss record.

End state: when a teamed player joins a game, their `teamId` and team name are snapshotted into the session. Host + player views show a team scoreboard alongside the individual scoreboard. Game-end stats writeback updates per-user *and* per-team aggregates. The team page surfaces the team's last few games.

## Out of scope (deferred)

- Team chat in-game
- Per-team timeouts or boosts
- Tournament brackets across multiple sessions
- Team handicapping (different point values for smaller teams)
- Public team-vs-team leaderboard across all sessions

## Prerequisites (already done)

- Teams collection + `users.teamId` (Plan 3)
- Game session model + scoring + finalize (Plans 7 + 8)
- Real-time hook (Plan 8) — extends naturally to team aggregates
- Stats writeback pattern (Plan 7's `finalize.ts`) — extends naturally to team stats

---

## Task list

Numbering picks up from Plan 8 (which ended at Task 186).

### Foundation

- **187. Schemas + types** —
  - `GameSessionPlayer` gains `teamId: string | null` and `teamNameSnapshot: string | null` (snapshotted at join time)
  - `TeamDoc` gains `stats: TeamStats { gamesPlayed, gamesWon, lastPlayedAt, recentGames: TeamGameSummary[] }`
  - New `TeamGameSummary { sessionId, venueNameSnapshot, finalRank, teamScore, totalTeams, playedAt }` (capped at 25 most recent)
  - `SerializedTeam` mirrors stats
- **188. Firestore rules** — no schema changes; team-doc reads already gated on member/captain. Verify the new stats writeback path stays server-only with a sanity test.

### Server routes

- **189. `POST /api/games/join`** — when adding the caller to `players`, look up `users/{uid}.teamId`. If set, fetch `teams/{teamId}.name` and snapshot both into the player record. Free agents (no teamId) join with `teamId: null`.
- **190. `lib/games/team-aggregate.ts`** — pure helper that takes the `players` map and returns `Array<{ teamId, teamNameSnapshot, score, members[] }>` sorted desc. Used by both client views and the finalize path.
- **191. `lib/games/finalize.ts`** — extend with team writeback. After per-user stats:
  - Group players by `teamId` (skip nulls)
  - For each team, sum member scores → team score
  - Compute team winner: unique top score, > 0 → that team wins
  - For each team: `gamesPlayed++`, `lastPlayedAt = now`, prepend `TeamGameSummary` to `recentGames` (cap 25), and if winner: `gamesWon++`. Stale teams (deleted between game start and end) silently no-op.

### Pages

- **192. `HostGameDashboard`** — add a "TEAMS" panel above the existing PLAYERS panel; uses `team-aggregate` to render team scoreboard live. Free agents grouped under "Solo" header.
- **193. `PlayerLiveView`** — header shows my team's rank + score next to my own score. Adds team scoreboard panel.
- **194. `(app)/team/page.tsx`** — adds "RECENT GAMES" section reading `team.stats.recentGames` (last 5). Shows: `<venue> — finished #N of M, +X pts`. Adds win-loss line ("3W / 2L this team").
- **195. `(admin)/admin/games/page.tsx`** — adds "Teams" column showing team count for each session.

### Tests

- **196. Integration: join with team** — seed user with `teamId`, join game, verify `players[uid].teamId` and `teamNameSnapshot` populated; free agent joins with both null.
- **197. Integration: team aggregation pure** — unit-test `team-aggregate.ts` with mixed teams + solo players.
- **198. Integration: team writeback on end** — full game lifecycle with two teams; verify winning team gets `gamesWon++`, both teams get `gamesPlayed++` and a `recentGames` entry; team that no longer exists is silently skipped.

### Final

- **199. Verification pass** — format, lint, typecheck, unit, integration, full E2E, build. Tag `plan-9-complete`.

---

## Acceptance criteria

1. A teamed player joining a game gets `teamId` + `teamNameSnapshot` recorded on their session player record.
2. A free-agent (no team) player joins with both null and is grouped under "Solo" in scoreboards.
3. Host dashboard shows a TEAMS panel with each team's running total, sorted desc, alongside the existing per-player list.
4. Player view shows their team's rank and team score in the header.
5. On game end, every team that had players gets `team.stats.gamesPlayed++` and a `recentGames[0]` entry; the unique top-scoring team gets `team.stats.gamesWon++`.
6. Tied teams → no team winner (no `gamesWon++` for any tied team).
7. `/team` shows the team's last 5 games as a list with rank and points.
8. If a team is deleted (admin disband, captain disband) between game start and game end, finalize silently skips that team's writeback.
9. All Plan 7 + Plan 8 acceptance criteria still pass (per-user scoring + stats unchanged).
10. CI green; integration suite up to ~213 tests; E2E unchanged.

---

## Decisions to lock in before execution

- **D1.** Free-agent players (no team) allowed in games? *Recommend: yes. Otherwise we'd need to either gate `/api/games/join` on `users.teamId` (UX cliff for solo players) or auto-create a "personal team" (data model bloat). Free agents stay simple.*
- **D2.** Team score = sum of member scores? *Recommend: yes. Average penalizes larger teams; weighting is overengineering for slice 1.*
- **D3.** Team-history storage: array on the team doc, capped at 25? *Recommend: yes. One-doc reads for `/team` page; older history archived only if hosts ask.*
- **D4.** Tie-breaker: unique top team score wins; ties → no team winner. *Recommend: yes — matches Plan 7 D6.*
- **D5.** Player team membership snapshotted at join time, not at end time? *Recommend: yes. If a player switches teams mid-game (theoretically), they still score for the team they joined as. Cleaner audit trail.*
- **D6.** Show live team scores during the game (vs only at game end)? *Recommend: yes. Live team scores are the whole point of "team" trivia.*
- **D7.** When the only player on a team leaves a game (closes browser), their team still appears in the scoreboard with whatever score they earned? *Recommend: yes — nothing in the data model lets a player "leave" a session anyway, and re-entry is by code.*

---

## Done

When all 13 tasks land, all acceptance criteria pass, and `git tag plan-9-complete` is pushed.
