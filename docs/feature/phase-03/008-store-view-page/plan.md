---
status: pending
---

# 008 — Store View Page

## Phase
3 — Core Data Out

## Goal
Build the per-store view page that combines the heatmap, probability header, and store selector into a cohesive page. This is the primary user-facing page of the app.

## Prerequisites
- 006-heatmap-visualization (heatmap component)
- 007-probability-header (probability header component)
- 005-sighting-submission (store selector component can be reused)

## References
- `docs/PRD.md` lines 162-180 — heatmap view + header bar
- `docs/PRD.md` line 170 — aggregate toggle

## Scope

### 1. Store view page
- Location: `app/store/[id]/page.tsx` (dynamic route by store ID)
- Server Component that:
  1. Fetches store details from DB by `id` param
  2. Fetches heatmap data for this store (from `lib/queries/heatmap.ts`)
  3. Fetches probability data (from `lib/queries/probability.ts`)
  4. Passes data to client components
- Layout:
  - Store name and location info at top
  - Probability header bar
  - Heatmap grid
  - "Log a sighting" CTA button (links to `/log` with store pre-selected)

### 2. Store navigation / selector
- Users need a way to find and navigate to a store view
- Options:
  - `/store` index page with a store search/selector → redirects to `/store/[id]`
  - Or integrate the store selector directly into the store view page header
- Store search: text search by name, city, state, or zip
- GPS-based "stores near me" as default sort
- Reuse or adapt the store selector from 005

### 3. Store index / landing
- Location: `app/store/page.tsx`
- If user has a `default_store_id` → auto-redirect to `/store/[default_store_id]`
- If no default → show store search/selector
- If unauthenticated → show store search (heatmap is public, submission requires auth)

### 4. Aggregate toggle integration
- On the store view page, include a tab or toggle: "This Store" | "All Stores"
- "All Stores" shows the aggregate heatmap (component from 006 with different data)
- URL-driven: could be `/store/[id]?view=aggregate` or a client-side toggle

### 5. Navigation updates
- Update the root layout header/nav (from 003) with:
  - Link to store view / store finder
  - Link to sighting submission
  - User menu (sign in/out, profile)
- Breadcrumb or back navigation within the store view

### 6. SEO and metadata
- Dynamic metadata for store pages: `title: "Costco Chicken Tracker — [Store Name]"`
- Description with city/state
- Use Next.js `generateMetadata` function

### 7. Public vs authenticated experience
- Heatmap view should be publicly accessible (anyone can see the data)
- Probability header adjustable for everyone (commute time persists only for authenticated users)
- "Log a sighting" button shows sign-in prompt for unauthenticated users
- This is a key growth feature: people can see value before signing up

## Key Decisions to Research
- URL structure: `/store/[id]` vs `/store/[slug]` (slugs are friendlier for SEO but need a slug field in the schema or a name-to-id resolver)
- Whether the store index page should show a map view (might be Phase 6 territory)
- How much of the page can be Server Component vs needs to be Client Component
- Caching strategy: heatmap data doesn't change frequently, consider ISR or time-based revalidation

## Verification
- Store view page renders with heatmap and probability header
- Store selector allows finding stores by name/location
- Default store redirect works for authenticated users
- Aggregate toggle switches between store-specific and all-store data
- Page works for both authenticated and unauthenticated users
- Dynamic metadata renders correctly
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- `bun run build` succeeds (SSR works correctly)
- Responsive layout on mobile and desktop

## Output
- `app/store/page.tsx` — store index/selector
- `app/store/[id]/page.tsx` — per-store view
- Navigation updates in root layout
- Any shared store-related components
