# 004 Store Data Pipeline — Research

## Summary

The upstream Costco dataset in `stiles/locations` is ready to use for this feature. The source already includes US store locations with stable store IDs and lat/lng coordinates, so the app can sync directly into the `stores` table without geocoding or scraping work in this repo.

## Source Repository

- Repository: `https://github.com/stiles/locations`
- README: `https://raw.githubusercontent.com/stiles/locations/main/README.md`
- Costco directory: `https://api.github.com/repos/stiles/locations/contents/costco?ref=main`

The upstream README describes the collection as US locations. That aligns with the PRD's V1 scope, so no additional country filter is required for this sync.

## Exact Costco Source Files

The Costco dataset is published in processed formats under:

- `costco/data/processed/costco_locations.csv`
- `costco/data/processed/costco_locations.json`
- `costco/data/processed/costco_locations.geojson`

Chosen implementation source:

- `https://raw.githubusercontent.com/stiles/locations/main/costco/data/processed/costco_locations.json`

Rationale:

- JSON is directly consumable in Bun and TypeScript
- It avoids adding a CSV parser dependency
- It preserves the same field set as the CSV export
- It is simpler to validate than GeoJSON for this use case

## Observed Source Shape

Observed fields in `costco_locations.json`:

- `store_id`
- `name`
- `street`
- `city`
- `state`
- `zip`
- `phone`
- `manager`
- `store_opened`
- `latitude`
- `longitude`
- `state_name`

Example record shape:

```json
{
  "store_id": 1087,
  "name": "Burnsville",
  "street": "14050 Burnhaven Dr",
  "city": "Burnsville",
  "state": "MN",
  "zip": "55337-4407",
  "phone": "(952) 229-6449                  ",
  "manager": "Chelsea Bell",
  "store_opened": "Nov 23, 2010",
  "latitude": 44.75,
  "longitude": -93.295,
  "state_name": "Minnesota"
}
```

## Source Data Characteristics

- Store count observed: `588`
- Duplicate `store_id` values observed: `0`
- Coordinates are present for each sampled row
- `store_id` appears to be the Costco warehouse/store number and is the best sync key

## Source-to-Database Mapping

| Source field | `stores` column | Transform |
|---|---|---|
| `store_id` | `external_id` | `String(store_id)` |
| `name` | `name` | `trim()` |
| `street` | `address` | `trim()` |
| `city` | `city` | `trim()` |
| `state` | `state` | `trim().toUpperCase()` |
| `zip` | `zip` | `trim()` |
| `latitude` | `lat` | validate finite number, store as DB-compatible numeric string |
| `longitude` | `lng` | validate finite number, store as DB-compatible numeric string |

Unused source fields for V1:

- `phone`
- `manager`
- `store_opened`
- `state_name`

These can be ignored because the current `stores` schema does not include them.

## Data Validation Requirements

Each source row should be rejected if any of the following are true:

- `store_id` is missing or not coercible to a stable string key
- `name`, `street`, `city`, `state`, or `zip` is empty after trimming
- `latitude` is not a finite number
- `longitude` is not a finite number

Recommended coordinate guardrails:

- `latitude` must be between `-90` and `90`
- `longitude` must be between `-180` and `180`

## Sync Behavior Decisions

- Sync key: `stores.external_id`
- Insert records not currently in `stores`
- Update existing records when any mapped field changes
- Soft-delete missing records by setting `active = false`
- Reactivate previously inactive records when they reappear in source
- Never hard-delete rows because `chicken_sightings` will eventually depend on `stores`

## Implementation Decisions

### Use plain TypeScript, not Effect

Decision:

- Implement the pipeline in plain TypeScript with explicit helper functions and structured error handling

Why:

- The repo does not currently include the `effect` package
- This feature is the first data pipeline in the codebase; introducing Effect here would expand scope
- The pipeline is still cleanly implementable with a small set of pure normalization and diff helpers plus one DB transaction

### Standalone scripts validate `DATABASE_URL` directly

Decision:

- Standalone scripts validate `process.env.DATABASE_URL` at the top of each script and do not use app-layer `src/lib/env.ts`
- The shared `syncStores()` pipeline accepts a DB instance from the caller and does not read env or instantiate Drizzle internally

Why:

- The current shared env module requires `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`
- A standalone store-sync script and GitHub Action should only need `DATABASE_URL`
- Pulling in app env validation from a standalone script creates the wrong dependency direction
- For a single variable, a dedicated shared env module is unnecessary abstraction

## Open Risks

- The upstream repo is not a formal API, so the file path or record shape could change without notice
- The sync script should fail fast on unexpected schema changes rather than silently ingesting partial data
- The current workspace does not have installed dependencies, so runtime verification still needs to happen after `bun install`

## Recommended Implementation Shape

- Shared pipeline module: `src/lib/pipeline/store-sync.ts`
- Production/CI entrypoint: `scripts/sync-stores.ts`
- Local dev entrypoint: `scripts/seed-stores.ts`
- Workflow: `.github/workflows/sync-stores.yml`

This keeps the sync logic reusable, keeps the scripts standalone, and avoids embedding pipeline logic directly in a GitHub Actions command script.
