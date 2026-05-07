# Plan 6 — Question Bank (Outline)

> Tight outline. Per-task detail expanded during execution.
> Spec doesn't define this slice — model is designed here.

## Goal

Approved hosts can author **question sets** — named, ordered collections of multiple-choice trivia questions — and edit/delete their own. Admins can list and delete any set. End state: `/host/question-sets` lists a host's sets; `/host/question-sets/new` and `/host/question-sets/[id]/edit` author them; `/admin/question-sets` is the moderation surface.

This is content infrastructure for Plan 7 (live game session): a game session will reference one question set at start time and use the snapshot of its questions for scoring.

## Out of scope (deferred)

- Question types other than 4-option multiple-choice (open-ended, numeric, image, audio)
- Categories / tags
- Public template library / sharing across hosts
- Drag-and-drop reordering (up/down arrows are enough for slice 1)
- Per-host limits enforced server-side beyond the doc-shape caps
- Question import (CSV, JSON)

## Prerequisites (already done)

- Approved-host gate via `requireApprovedHost()` (Plan 5)
- Admin gate via `requireAdmin()` (Plan 4)
- Firestore default-deny baseline; rules pattern for owner + admin reads (Plan 5)

---

## Task list

Numbering picks up from Plan 5 (which ended at Task 129).

### Foundation

- **130. Schemas + types** — `lib/validation/schemas.ts` adds `questionSchema`, `questionSetMetaSchema`, `createQuestionSetSchema`, `updateQuestionSetSchema`. `types/firestore.ts` adds `Question`, `QuestionSetDoc`, `SerializedQuestionSet`.
- **131. Firestore rules** — `questionSets/{setId}`: owner-host or admin can read; writes server-only.

### Server routes

- **132. `POST /api/question-sets`** — create (approved host). Body: `{name, description?, questions[]}`. Validates per-question shape. Auto-id; sets `ownerUid`.
- **133. `GET /api/question-sets`** — list caller-owned sets (slim payload — no questions, just meta).
- **134. `GET /api/question-sets/[id]`** — full set with questions. Owner or admin.
- **135. `PATCH /api/question-sets/[id]`** — update meta + replace questions array. Owner only.
- **136. `DELETE /api/question-sets/[id]`** — owner deletes (hard).
- **137. `GET /api/admin/question-sets`** — admin lists all with owner display name + question count.
- **138. `DELETE /api/admin/question-sets/[id]`** — admin delete.

### Pages

- **139. `(app)/host/question-sets/page.tsx`** — host dashboard list. Empty state CTA.
- **140. `(app)/host/question-sets/new/page.tsx`** — create form (meta + question editor).
- **141. `(app)/host/question-sets/[id]/edit/page.tsx`** — edit form, owner-only (404 otherwise).
- **142. `(admin)/admin/question-sets/page.tsx`** — admin list with searchable filter + typed-confirmation delete; update `AdminNav` and overview count.

### Components

- **143. `QuestionSetEditor`** — client component that holds the array of questions, supports add/remove/up/down reorder, edits the four-option choice list per question, and submits the whole set.

### Tests

- **144. Rules tests** — owner reads own; non-owner non-admin denied; admin reads all; nobody writes directly. ~5 cases.
- **145. Route integration tests** — happy + error paths for each route. ~14 cases.
- **146. E2E middleware redirects** for `/host/question-sets/*` and `/admin/question-sets`.

### Final

- **147. Verification pass** — format, lint, typecheck, unit, integration, E2E, build. Tag `plan-6-complete`.

---

## Acceptance criteria

1. Approved host visits `/host/question-sets` and sees empty state on first run.
2. Host can create a set with 1+ questions; set appears in list.
3. Host can edit the meta and the question array, reorder questions up/down, add/remove questions.
4. Owner cannot read another host's set (403).
5. Admin can list all sets and delete any.
6. Firestore rules enforce: only owner or admin reads; all writes server-only.
7. Questions shape validated: prompt 5–500 chars; exactly 4 choices each 1–200 chars; correctIndex 0–3; points 1–10.
8. Question count cap: 1–50 per set.
9. All test layers green; CI green.

---

## Decisions to lock in before execution

- **D1.** Question type: 4-option multiple choice only? *Recommend: yes. Open-ended/numeric land in a later slice.*
- **D2.** Storage: array on the set doc (single Firestore read on game start) vs subcollection (more flexible)? *Recommend: array. With a 50-question cap and 1MB Firestore doc limit, plenty of headroom. Single read keeps Plan 7 game start fast.*
- **D3.** Limits: name 60 chars, description 300 chars, prompt 5–500 chars, choice 1–200 chars, points 1–10, 1–50 questions per set. *Recommend: yes.*
- **D4.** Categories / tags? *Recommend: skip for slice 1. Add later if hosts ask.*
- **D5.** Reordering UX: up/down buttons vs drag-and-drop? *Recommend: up/down. Simple, accessible by default. DnD is polish.*
- **D6.** Admin can list all sets but cannot edit. *Recommend: yes — admins moderate, don't author.*

---

## Done

When all 18 tasks land, all acceptance criteria pass, and `git tag plan-6-complete` is pushed. Plan 7 (live game session + scoring) builds on this.
