---
status: pending
---

# 004 — Store Data Pipeline

## Phase
2 — Core Data In

## Goal
Build a GitHub Action that fetches Costco store location data from the `stiles/locations` repo, parses and validates it, and upserts into the `stores` table. Also provide a manual seed script for local dev.

## Prerequisites
- 001-database-setup (Drizzle schema with `stores` table, DB client)

## References
- `docs/PRD.md` lines 117-127 — store data pipeline spec
- `docs/PRD.md` lines 56-69 — `stores` table schema
- Source data: https://github.com/stiles/locations (research exact file path/format for Costco locations)
- `docs/PRD.md` lines 38-48 — Effect integration notes (this is a strong Effect candidate)

## Scope

### 1. Research the source data
- Clone/browse `stiles/locations` repo to find:
  - Exact file path for Costco store data
  - File format (CSV, JSON, GeoJSON?)
  - Available fields and how they map to the `stores` schema
  - What to use as `external_id` (Costco store number? Some other unique identifier?)
  - Whether lat/lng are included or need geocoding

### 2. Create the sync script
- Location: `lib/pipeline/store-sync.ts` (or `scripts/sync-stores.ts`)
- Logic (sequential pipeline):
  1. **Fetch** — download the source file from GitHub (raw content URL or API)
  2. **Parse** — parse CSV/JSON into structured records
  3. **Validate** — ensure required fields present, lat/lng are valid numbers, etc.
  4. **Diff** — compare against existing `stores` table:
     - New `external_id` values → insert
     - Existing `external_id` values → update if data changed
     - Missing `external_id` values (in DB but not in source) → set `active = false` (soft-delete)
     - Do NOT hard-delete — preserve FK integrity with `chicken_sightings`
  5. **Upsert** — execute the database operations
  6. **Report** — log summary: inserted, updated, soft-deleted counts
- This is a strong candidate for Effect (`Effect.gen` pipeline with typed errors for fetch failure, parse failure, validation errors, DB errors)
- If not using Effect, use plain TypeScript with explicit error handling

### 3. Create the GitHub Action workflow
- Location: `.github/workflows/sync-stores.yml`
- Triggers:
  ```yaml
  on:
    schedule:
      - cron: '0 0 1 */3 *'   # quarterly (1st of every 3rd month)
    workflow_dispatch:           # manual trigger
  ```
- Steps:
  1. Checkout repo
  2. Install Bun
  3. Install dependencies (`bun install`)
  4. Run sync script (`bun run scripts/sync-stores.ts` or similar)
- Environment:
  - `DATABASE_URL` from GitHub Secrets (production DB)
- Error handling:
  - Fail the workflow if sync script exits non-zero
  - Consider: post a GitHub issue or send notification on failure?

### 4. Create a dev seed script
- Location: `scripts/seed-stores.ts`
- Purpose: populate local dev DB with store data without needing to run the full GHA pipeline
- Can reuse the same sync logic, just pointed at the dev DB
- Add `db:seed` script to `package.json`

### 5. Add package.json scripts
- `db:seed` — run the seed script for local dev

## Key Decisions to Research
- Exact format and location of Costco data in `stiles/locations`
- What field to use as `external_id`
- Whether to use Effect for the pipeline (PRD recommends it as a strong candidate)
- How to handle the source data disappearing or format changing (error resilience)
- Whether to filter to US-only locations (PRD says international is out of scope for V1)

## Data Mapping
Research the source and fill in this mapping:

| Source field | `stores` column | Transform needed? |
|---|---|---|
| ??? | `external_id` | ??? |
| ??? | `name` | ??? |
| ??? | `address` | ??? |
| ??? | `city` | ??? |
| ??? | `state` | ??? |
| ??? | `zip` | ??? |
| ??? | `lat` | ??? |
| ??? | `lng` | ??? |

## Verification
- Sync script runs successfully against dev DB
- Stores are inserted with correct data
- Re-running is idempotent (upsert, not duplicate)
- Removing a store from source sets `active = false` in DB
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- GHA workflow YAML is valid (can lint with `actionlint` if available)
- Dev seed script populates local DB

## Output
- `lib/pipeline/store-sync.ts` (or `scripts/sync-stores.ts`)
- `scripts/seed-stores.ts`
- `.github/workflows/sync-stores.yml`
- Updated `package.json` (new scripts)
