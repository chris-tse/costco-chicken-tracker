---
status: pending
---

# 005 — Sighting Submission Form

## Phase
2 — Core Data In

## Goal
Build the sighting submission form that lets authenticated users log a rotisserie chicken label timestamp at a specific Costco store, with GPS-based store detection, validation, and rate limiting.

## Prerequisites
- 001-database-setup (Drizzle schema with `chicken_sightings`, `stores` tables)
- 002-auth-setup (authenticated user session required)
- 004-store-data-pipeline (stores must be populated for store selection)

## References
- `docs/PRD.md` lines 148-160 — log a sighting spec
- `docs/PRD.md` lines 95-111 — `chicken_sightings` schema
- `docs/PRD.md` lines 200-207 — data quality / passive checks
- `docs/PRD.md` lines 38-48 — Effect integration notes (this is a strong Effect candidate)

## Scope

### 1. iOS-style wheel time picker component
- Location: `components/time-picker.tsx`
- Three wheels: hour (1-12), minute (00-59), AM/PM
- Touch-friendly, works on mobile
- Research: existing React wheel/drum picker libraries compatible with React 19, or build a custom one
- Output: a `Date` or time string representing the label timestamp
- Should default to current time as starting position
- Combine selected time with today's date to produce `label_time`

### 2. Store selector component
- Location: `components/store-selector.tsx`
- GPS auto-detection flow:
  1. Request browser Geolocation API permission
  2. If granted, find nearest store(s) by haversine distance from user coords
  3. Pre-select the nearest store
  4. If user has a `default_store_id` set, prefer that over GPS (unless GPS shows a closer match)
- Manual override: searchable dropdown/combobox of all active stores
- Show store name, city, state in the selector
- Emit selected `store_id`, and capture `user_lat` / `user_lng` for the sighting record

### 3. GPS proximity check
- If user grants location permission, compare user coords to selected store coords
- Calculate haversine distance
- If distance > threshold (research: reasonable threshold, maybe 5-10 miles?):
  - Show warning: "You appear to be far from this store. Are you sure?"
  - Require explicit confirmation to proceed
  - Do NOT block submission, just warn

### 4. Submission form page
- Location: `app/log/page.tsx` (or `app/submit/page.tsx` — pick a clear route)
- Components:
  - Time picker (from step 1)
  - Store selector (from step 2)
  - Optional notes textarea
  - Submit button
- Must be behind auth (redirect to sign-in if unauthenticated)
- "use client" directive needed for interactive components

### 5. Server action for submission
- Location: `lib/actions/sightings.ts` (or `app/log/actions.ts`)
- Validation pipeline (strong Effect candidate):
  1. **Auth check** — verify user is authenticated
  2. **Timestamp validation**:
     - Future timestamps → hard reject (return error, do not insert)
     - Timestamps > 4 hours old → soft flag (`flagged = true`, `flag_reason = 'stale_timestamp'`), still insert
  3. **Rate limit check** — count user's submissions for this store today:
     - If >= 6 → reject with descriptive error
  4. **GPS proximity** — if `user_lat`/`user_lng` provided, flag if far from store (server-side validation mirrors client-side warning)
  5. **Insert** — write to `chicken_sightings`:
     - `user_id` from session
     - `store_id` from form
     - `label_time` from time picker
     - `observed_at` = `NOW()`
     - `user_lat`, `user_lng` from geolocation (nullable)
     - `flagged`, `flag_reason` based on validation
     - `admin_reviewed = false`, `admin_approved = null`
  6. **Default store update** — on first confirmed submission, save `store_id` as user's `default_store_id` if not already set
- Return structured result: `{ success: true }` or `{ success: false, error: string }`

### 6. Success feedback
- On successful submission:
  - Show success toast/notification
  - Optionally reset form for another submission
  - Show count of submissions today for context
- On error:
  - Show specific error message (rate limit, future timestamp, etc.)

## Haversine Distance Utility
- Location: `lib/geo.ts`
- Implement haversine formula for distance between two lat/lng coordinates
- Export for reuse (needed here and potentially in the heatmap store selector)
- Unit: miles (US-centric app)

## Key Decisions to Research
- Wheel picker: build custom or use a library? Candidates:
  - `react-mobile-picker` — check React 19 compatibility
  - Custom CSS scroll-snap implementation
  - Research alternatives
- GPS threshold distance for "far from store" warning (5 miles? 10 miles? configurable?)
- Whether to use Effect for the submission validation pipeline
- Route naming: `/log` vs `/submit` vs `/report`
- How to handle timezone — label time is local to the store's timezone, need to store as proper TIMESTAMPTZ

## Verification
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- Form renders and is usable on mobile viewport
- Time picker produces correct timestamp
- Store selector shows stores from DB, GPS pre-selection works
- Validation tests:
  - Future timestamp → rejected
  - Stale timestamp → accepted but flagged
  - 7th submission same store same day → rejected
  - Far from store → warning shown
- Server action inserts correct data into `chicken_sightings`
- Unauthenticated users redirected to sign-in
- Write unit tests for:
  - Timestamp validation logic
  - Rate limit logic
  - Haversine distance calculation
  - GPS proximity check

## Output
- `components/time-picker.tsx`
- `components/store-selector.tsx`
- `app/log/page.tsx` (or chosen route)
- `lib/actions/sightings.ts`
- `lib/geo.ts`
- Tests for validation and geo utilities
