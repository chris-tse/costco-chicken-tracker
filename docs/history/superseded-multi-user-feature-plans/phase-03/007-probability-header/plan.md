---
status: pending
---

# 007 — Probability Header Bar

## Phase
3 — Core Data Out

## Goal
Build the probability header bar that sits above the heatmap, showing "best times today" and a rolling "probability of fresh chicken in the next X minutes" based on the user's commute time.

## Prerequisites
- 001-database-setup
- 006-heatmap-visualization (heatmap query and component exist; header sits above it)

## References
- `docs/PRD.md` lines 176-180 — header / probability bar spec
- `docs/PRD.md` lines 141-142 — user profile: commute_minutes setting

## Scope

### 1. "Best times today" calculation
- Location: `lib/queries/probability.ts`
- Logic:
  1. Determine today's day of week
  2. Query `chicken_sightings` for the given store on this day of week (historically)
  3. Group by hour, count sightings per hour
  4. Return the top 2-3 hours with highest sighting counts
  5. Format as human-readable times: "Best times today: 11:00 AM, 2:00 PM, 5:00 PM"
- Edge cases:
  - No data for today's day of week → show "Not enough data yet"
  - Only 1 peak hour → show just that one
  - Ties → show all tied hours up to 3

### 2. "Probability of fresh chicken" rolling window
- Logic:
  1. Get user's `commute_minutes` setting (default 15 if not set)
  2. Calculate the time window: now → now + commute_minutes
  3. Look at historical sightings for this store on this day of week in that time window
  4. Compute a probability estimate:
     - Research: what probability model makes sense? Options:
       - Simple frequency ratio: (sightings in this window / total observation days for this day of week)
       - Smoothed with neighboring time buckets
       - Bayesian with prior based on overall store frequency
     - Start with the simple frequency ratio for MVP, document the formula
  5. Display as: "Probability of fresh chicken in the next 15 min: 73%"
- Edge cases:
  - Zero historical data → "Not enough data to estimate"
  - Very low sample size → show probability with a "low confidence" qualifier

### 3. Inline commute time adjuster
- `docs/PRD.md` line 180 — "Commute window configurable inline without going to profile settings"
- Small inline control next to the probability display
- Options:
  - A compact number input or stepper (+/- buttons)
  - Or a small dropdown with common values: 5, 10, 15, 20, 30, 45, 60 min
- Changing it:
  - Immediately recalculates the probability display (client-side if possible, or re-fetch)
  - Persists the new value to the user's `commute_minutes` in the DB (debounced server action)
  - Works for unauthenticated users too (local state only, no persistence)

### 4. Header bar component
- Location: `components/probability-header.tsx`
- Layout:
  - Full width above the heatmap
  - Left: "Best times today: ..." 
  - Right: "Probability of fresh chicken in the next X min: Y%"
  - Commute adjuster inline next to the probability
- Responsive: stack vertically on mobile
- Visual design:
  - Use project design tokens
  - Probability value could be color-coded (green = high, yellow = medium, red = low)
  - Consider a subtle progress/gauge visual for the probability percentage

### 5. Server action for commute time update
- Location: `lib/actions/user.ts`
- Simple update: `UPDATE users SET commute_minutes = ? WHERE id = ?`
- Validate: commute_minutes must be positive integer, max 120 minutes (sanity cap)
- Debounce on client side to avoid excessive calls

## Key Decisions to Research
- Probability model: simple frequency ratio vs something more sophisticated
- How to handle the "observation days" denominator — is it the number of distinct days with any sighting at this store, or the number of weeks since the store's first sighting?
- Whether to compute probability server-side or ship the data to the client and compute there (tradeoff: less server load vs exposing raw data)
- Timezone handling: "today" and "now" should be in the store's local timezone, not UTC

## Verification
- Best times display shows correct top hours for current day of week
- Probability percentage changes when commute time is adjusted
- Commute time persists to DB for authenticated users
- Edge cases handled gracefully (no data, sparse data)
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- Renders correctly on mobile and desktop
- Write unit tests for probability calculation logic

## Output
- `components/probability-header.tsx`
- `lib/queries/probability.ts`
- `lib/actions/user.ts` (commute time update)
- Tests for probability calculation
