---
status: pending
---

# 017 — Aggregate Cross-Store Heatmap

## Phase
6 — Future / Stretch

## Goal
Expand the aggregate heatmap view beyond the simple toggle (from 008) into a richer cross-store analysis tool.

## Prerequisites
- 006-heatmap-visualization
- 008-store-view-page (basic aggregate toggle exists)
- Sufficient data across multiple stores

## References
- `docs/PRD.md` line 228 — "Aggregate cross-store heatmap beyond the toggle"
- `docs/PRD.md` line 170 — basic aggregate toggle (already in Phase 3)

## Scope

### 1. Dedicated aggregate page
- Location: `app/heatmap/page.tsx` or `/explore`
- Not tied to a single store — shows cross-store patterns
- Store filtering: select multiple stores to include/exclude
- Region filtering: by state, city, or geographic radius

### 2. Comparative view
- Side-by-side heatmaps for two stores
- Highlight differences: which time slots are strong at Store A but not Store B
- Useful for users who shop at multiple Costco locations

### 3. National patterns
- Aggregate across all stores (already possible in Phase 3)
- Overlay: weekday vs weekend patterns
- Seasonal trends (if enough historical data)

### 4. Map-based exploration
- Interactive map with store markers
- Marker color/size indicates data density or average sighting frequency
- Click marker → shows mini heatmap or links to store view
- Likely requires a mapping library (Mapbox, Leaflet, or Google Maps)

### 5. Shareable views
- URL-encoded state so users can share specific views
- OpenGraph preview with a rendered heatmap image (SSR challenge)

## Key Decisions to Research
- Mapping library choice (cost, bundle size, ease of use)
- Whether aggregation should be pre-computed (materialized view) or computed on demand
- How to render heatmap images for OpenGraph previews

## Output
- Aggregate heatmap page
- Store comparison view
- Map-based exploration (possibly)
- Shareable URL scheme
