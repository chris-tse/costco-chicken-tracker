---
status: pending
---

# 016 — Doneness Rating

## Phase
6 — Future / Stretch

## Goal
Add an optional doneness rating (1-3 scale) to the sighting submission form, enabling quality-dimension analysis alongside the freshness heatmap.

## Prerequisites
- 005-sighting-submission (form exists)
- Schema already supports it (`doneness SMALLINT` column exists, nullable)

## References
- `docs/PRD.md` lines 243-246 — Footnote B: doneness as a metric
- `docs/PRD.md` line 108 — `doneness` column already in schema

## Scope

### 1. Add doneness input to submission form
- Optional field, not required (keep the form frictionless per PRD)
- Simple 1-3 scale:
  - 1 = Under-done
  - 2 = Ideal
  - 3 = Over-done
- UI: three toggleable buttons or a simple radio group with visual indicators
- Position: below the time picker, before the notes field
- Label: "How was the doneness?" with a "Skip" option or just leave unselected

### 2. Update submission server action
- Accept optional `doneness` field (1, 2, 3, or null)
- Validate: must be 1, 2, or 3 if provided
- Insert into `chicken_sightings.doneness`

### 3. Doneness overlay on heatmap (future consideration)
- Could add a doneness dimension to the heatmap:
  - Color-code by average doneness instead of frequency
  - Or show doneness distribution in the cell popover
- This is out of scope for the initial doneness feature — just collect the data first

### 4. Doneness stats in cell popover
- Update the heatmap cell popover (from 006) to show:
  - Average doneness for that time bucket (if data exists)
  - Distribution: "X under-done, Y ideal, Z over-done"

## Output
- Updated sighting submission form
- Updated submission server action
- Updated heatmap cell popover
