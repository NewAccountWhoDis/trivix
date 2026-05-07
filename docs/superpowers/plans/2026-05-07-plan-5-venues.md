# Plan 5 — Venues (Outline)

> Tight outline. Per-task detail expanded during execution.
> Source of truth: spec section 4 (data model) — `users.stats.venues` references venues.

## Goal

Approved hosts can manage the venues where they run trivia. Each venue is a server-written doc owned by one host, with a name + address. Admin can list/delete any venue. End state: `(app)/host` shows a venue dashboard; create/edit/delete flows work; admin portal has a venues tab.

This plan is infrastructure for Plan 6 (question bank) and Plan 7 (live game). Players don't see venues directly yet — they'll only see them in their stats once games run.

## Out of scope (deferred)

- Public venue browsing (deferred to Plan 7 once games exist)
- Geocoding / map integration
- Venue photos / branding
- Cap on venues per host
- Soft delete (hard delete is fine — no game sessions reference venues yet)

## Prerequisites (already done)

- `users.role === "host"` + `hostStatus === "approved"` flag set via Plan 4 admin approval
- `users.stats.venues` typed (Plan 2) — populated by future game flow
- Admin portal chrome + `requireAdmin()` helper from Plan 4

---

## Task list

Numbering picks up from Plan 4 (which ended at Task 112).

### Foundation

- **113. Schemas + types** — `lib/validation/schemas.ts` adds `createVenueSchema`, `updateVenueSchema`. `types/firestore.ts` adds `VenueDoc`, `SerializedVenue`. Address: structured (street, city, state, zip). All US-format; spec doesn't call for international.
- **114. Firestore rules** — `venues/{venueId}`: host-owner can read; admin can read all; writes server-only.

### Server routes

- **115. `POST /api/venues`** — create. Verifies `role === "host"` AND `hostStatus === "approved"`. Auto-id; sets `ownerUid`.
- **116. `GET /api/venues`** — list venues owned by caller (host only).
- **117. `GET /api/venues/[id]`** — single venue. Owner or admin.
- **118. `PATCH /api/venues/[id]`** — update name/address. Owner only.
- **119. `DELETE /api/venues/[id]`** — delete. Owner only. (Hard delete — nothing references venues yet.)
- **120. `GET /api/admin/venues`** — list all venues with owner display name. Admin only.
- **121. `DELETE /api/admin/venues/[id]`** — admin delete. Same as 119 but bypasses owner check.

### Pages

- **122. `(app)/host/page.tsx`** — replace placeholder with venue dashboard. Lists owned venues; "Add venue" CTA. Still server-checks `role === "host"` + `hostStatus === "approved"`.
- **123. `(app)/host/venues/new/page.tsx`** — create form (name + address fields).
- **124. `(app)/host/venues/[id]/edit/page.tsx`** — edit form. 404s for non-owners.
- **125. `(admin)/admin/venues/page.tsx`** — admin venues list with owner column + typed-confirmation delete. Update `AdminNav` to include the tab.

### Tests

- **126. Rules tests** — host reads own; non-owner non-admin denied; admin reads all; nobody writes directly. ~6 cases.
- **127. Route integration tests** — happy + 401/403/404/400 for each route. ~16 cases.
- **128. E2E** — middleware redirects for `/host/venues/*` and `/admin/venues`.

### Final

- **129. Verification pass** — format, lint, typecheck, unit, integration vs emulator, full E2E, build. Tag `plan-5-complete`.

---

## Acceptance criteria

1. Approved host visits `/host` and sees their venues list (empty state if none).
2. Host can create a venue with name + structured address; appears in their list.
3. Host can edit + delete their own venues.
4. Non-host (player or pending host) hitting `/host/venues/*` gets the existing host-locked screen.
5. Owner cannot edit or delete another host's venue (403).
6. Admin can list every venue at `/admin/venues` with owner name.
7. Admin can delete any venue.
8. Firestore rules enforce: only owner or admin can read; all writes server-only.
9. All test layers green; CI green.

---

## Decisions (resolved 2026-05-07)

- **D1.** Address is structured: `street, city, state (2-letter), zip (5 or 5+4)`. US-only.
- **D2.** Hard delete. Future game sessions snapshot `{venueId, venueName}` at game-start, so deletion never breaks history.
- **D3.** No per-host name uniqueness — chains allowed. Address fields disambiguate.
- **D4.** Admins do not create venues. Hosts own; admins moderate (list + delete only).
- **D5.** Field limits: name 60 chars, street 100, city 50, state 2, zip 10.

---

## Done

When all 17 tasks land, all acceptance criteria pass, and `git tag plan-5-complete` is pushed. Plan 6 (question bank) builds on this.
