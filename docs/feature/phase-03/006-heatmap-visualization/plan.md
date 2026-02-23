---
status: pending
---

# 006 — Heatmap Visualization

## Phase
3 — Core Data Out

## Goal
Build the day-of-week x time-of-day heatmap component using Observable Plot, showing sighting frequency per bucket with color-coded intensity, cell popovers, and proper empty/sparse states.

## Prerequisites
- 001-database-setup (DB schema and client)
- 004-store-data-pipeline (stores populated)
- 005-sighting-submission (data exists to visualize — can use seed data for dev)

## References
- `docs/PRD.md` lines 162-174 — heatmap view spec
- Observable Plot docs: https://observablehq.com/plot/
- Observable Plot `rect` mark: https://observablehq.com/plot/marks/rect

## Scope

### 1. Install Observable Plot
- `@observablehq/plot` — the visualization library
- Research: any peer dependencies needed? Does it work with React 19 SSR?
- Observable Plot renders to a DOM node — need a React ref-based wrapper component

### 2. Heatmap aggregation query
- Location: `lib/queries/heatmap.ts`
- Query: aggregate `chicken_sightings` for a given `store_id`
  - Group by: day of week (0-6, Sun-Sat) and hour of day (0-23)
  - Count sightings per bucket
  - Only include approved sightings (`admin_approved = true`) OR unreviewed (`admin_approved IS NULL`) — exclude rejected (`admin_approved = false`)
- Return shape: array of `{ day: number, hour: number, count: number }`
- Also return metadata: total sightings for the store, date range of data
- Consider: make bucket size configurable (1hr for MVP, 30min/15min later) — the query should use `date_trunc` or `extract` at the appropriate granularity
- This is a simple query — Effect is probably overkill here per PRD guidance

### 3. Observable Plot heatmap component
- Location: `components/heatmap.tsx`
- Must be a Client Component (`"use client"`) since Observable Plot manipulates the DOM
- Use a `useRef` + `useEffect` pattern to render the Plot into a container div
- Plot configuration:
  - X axis: hour of day (0-23, labeled as 12-hour with AM/PM)
  - Y axis: day of week (Mon-Sun, labeled as day names)
  - Mark: `Plot.cell()` or `Plot.rect()` with `fill` mapped to count
  - Color scale: sequential (e.g., white → deep color), relative to the current store's min/max count
  - Low confidence: cells with count below a threshold (research: what threshold?) get a visual indicator — hatching, opacity reduction, or a dashed border
  - Empty cells: show as background color (no data for that bucket)
  - Responsive: scale to container width
- Props: `data: { day: number, hour: number, count: number }[]`, `maxCount: number`

### 4. Cell popover on tap/click
- Use Shadcn `Popover` component
- On clicking a heatmap cell, show:
  - Total data points for this store
  - Data points for this specific time bucket
  - Confidence score (research: how to compute — could be based on sample size relative to expected or relative to most-observed bucket)
  - Bucket size context (e.g., "1-hour window: 2:00 PM - 3:00 PM")
- Research: how to position a Shadcn Popover relative to an SVG element. May need to:
  - Use a transparent HTML overlay positioned over the SVG cells, OR
  - Use Observable Plot's built-in event handling to get cell coordinates, then position a Popover at those coords

### 5. Empty state
- When a store has zero sightings, show a friendly empty state:
  - Message: "No sightings yet for this store"
  - CTA: link to the sighting submission form
- When a store has very few sightings (< threshold), show the heatmap but with a banner: "Limited data — results may not be representative"

### 6. Aggregate all-stores toggle
- `docs/PRD.md` line 170 — "Aggregate view across all stores available as a toggle/tab"
- Add a toggle/tab above the heatmap: "This Store" | "All Stores"
- "All Stores" runs the same aggregation query without the `store_id` filter
- Same heatmap component, different data

## Key Decisions to Research
- Observable Plot + React 19 compatibility and SSR considerations
- How to handle the SVG click → Shadcn Popover positioning bridge
- Color palette for the heatmap (accessibility: should work for colorblind users — avoid red-green, prefer sequential single-hue or viridis-like)
- Low confidence threshold (absolute count? percentile? configurable?)
- Confidence score formula

## Verification
- Heatmap renders correctly with seed data
- Color intensity varies with count
- Low-confidence cells visually distinct
- Empty state shown for stores with no data
- Cell click opens popover with correct data
- Aggregate toggle switches data source
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- Component renders without hydration errors
- Responsive on mobile and desktop
- Accessible color palette

## Output
- `components/heatmap.tsx` — Observable Plot wrapper
- `components/heatmap-popover.tsx` — cell detail popover
- `lib/queries/heatmap.ts` — aggregation query
- Tests for the aggregation query logic
