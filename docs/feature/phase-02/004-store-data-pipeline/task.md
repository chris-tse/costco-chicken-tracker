# 004 Store Data Pipeline — Tasks

Each task below is independently executable. Tasks are ordered by dependency.
Status key: `[ ]` pending, `[~]` in progress, `[x]` done, `[-]` skipped/cancelled.

---

## Task 1: Lock source-data contract and define standalone script env handling

- [x] Create `research.md` in this directory with the source-data findings for `stiles/locations`
- [x] Record the exact Costco source path: `costco/data/processed/costco_locations.json`
- [ ] Document the source-to-schema mapping:
  - [x] `store_id` -> `stores.external_id` as `String(store_id)`
  - [x] `name` -> `stores.name`
  - [x] `street` -> `stores.address`
  - [x] `city` -> `stores.city`
  - [x] `state` -> `stores.state`
  - [x] `zip` -> `stores.zip`
  - [x] `latitude` -> `stores.lat`
  - [x] `longitude` -> `stores.lng`
- [ ] Document that standalone store-sync scripts must validate `DATABASE_URL` themselves
- [x] Keep the shared pipeline env-agnostic so it does not import app-layer env config
- [ ] Ensure the standalone scripts do not depend on `src/lib/env.ts`

**Files:** `docs/feature/phase-02/004-store-data-pipeline/research.md`, `scripts/sync-stores.ts`, `scripts/seed-stores.ts`
**Verify:** each standalone script validates `DATABASE_URL` directly and does not import `src/lib/env.ts`

---

## Task 2: Build the reusable store sync pipeline

- [x] Create `src/lib/pipeline/store-sync.ts`
- [x] Design `syncStores()` to accept a DB instance from the caller rather than reading env internally
- [x] Implement a fetch step that downloads the Costco source JSON from the raw GitHub URL
- [x] Define and validate the expected source record shape
  - [x] Reject records missing required fields (`store_id`, `name`, `street`, `city`, `state`, `zip`, `latitude`, `longitude`)
  - [x] Reject records with invalid coordinates
- [x] Normalize source records into DB-ready store objects
  - [x] Trim string fields
  - [x] Uppercase state abbreviations
  - [x] Convert numeric coordinates and external IDs to the DB-compatible string shape used by Drizzle
- [x] Load existing `stores` rows and diff by `external_id`
  - [x] New source rows -> insert
  - [x] Existing changed rows -> update
  - [x] Missing source rows -> set `active = false`
  - [x] Previously inactive rows that reappear -> set `active = true`
- [x] Apply inserts and updates in a transaction
- [x] Return a summary object with inserted, updated, deactivated, reactivated, and unchanged counts

**File:** `src/lib/pipeline/store-sync.ts`
**Depends on:** Task 1
**Verify:** the pipeline is idempotent when run twice against unchanged source data

---

## Task 3: Add CLI entrypoints and package scripts

- [ ] Create `scripts/sync-stores.ts` as the production and CI entrypoint
- [ ] Create `scripts/seed-stores.ts` as the local-dev entrypoint
- [ ] Make both scripts call the shared `syncStores()` pipeline from Task 2
- [ ] Validate `process.env.DATABASE_URL` at the top of each script before creating the DB client
- [ ] Create the Drizzle DB instance inside each script and pass it into `syncStores()`
- [ ] Ensure both scripts log a concise summary and exit non-zero on failure
- [ ] Update `package.json`
  - [ ] Add `stores:sync`
  - [ ] Add `db:seed`

**Files:** `scripts/sync-stores.ts`, `scripts/seed-stores.ts`, `package.json`
**Depends on:** Task 2
**Verify:** `bun run stores:sync` and `bun run db:seed` execute the shared pipeline

---

## Task 4: Add tests for normalization, diffing, and failure handling

- [x] Create `src/lib/pipeline/store-sync.test.ts`
  - [x] Test: valid source rows normalize into the expected `stores` payload
  - [x] Test: malformed source rows fail validation with a structured error
  - [x] Test: a new source row is classified as an insert
  - [x] Test: a changed existing row is classified as an update
  - [x] Test: a missing existing row is soft-deactivated
  - [x] Test: an inactive row that reappears is reactivated
  - [x] Test: unchanged rows produce no writes
  - [ ] Test: fetch failures cause the CLI wrapper to exit non-zero

**File:** `src/lib/pipeline/store-sync.test.ts`
**Depends on:** Task 2, Task 3
**Verify:** `bunx vitest run src/lib/pipeline/store-sync.test.ts` passes

---

## Task 5: Add the scheduled GitHub Actions workflow

- [ ] Create `.github/workflows/sync-stores.yml`
- [ ] Trigger on quarterly schedule and manual dispatch
- [ ] Reuse the existing Bun installation pattern from the current CI workflow
- [ ] Install dependencies with `bun install --frozen-lockfile`
- [ ] Run `bun run stores:sync`
- [ ] Configure workflow env to require only `DATABASE_URL`
- [ ] Fail fast on pipeline errors without adding extra notification behavior in this feature

**File:** `.github/workflows/sync-stores.yml`
**Depends on:** Task 1, Task 3
**Verify:** workflow YAML is valid and references the production sync command

---

## Task 6: Record implementation decisions and close feature docs

- [ ] Update `docs/decisions.md` with the final implementation decisions
  - [ ] JSON source selected over CSV
  - [ ] `store_id` selected as `external_id`
  - [ ] Plain TypeScript selected over Effect for this pipeline
  - [ ] Standalone scripts validate `DATABASE_URL` directly and do not use app-layer `env.ts`
- [ ] Update `docs/feature/phase-02/004-store-data-pipeline/plan.md`
  - [ ] Change status from `pending` to `done` after implementation completes
  - [ ] Replace open research placeholders with the final data mapping and decisions

**Files:** `docs/decisions.md`, `docs/feature/phase-02/004-store-data-pipeline/plan.md`
**Depends on:** Task 1, Task 5
**Verify:** docs reflect the final implementation and no open placeholders remain in `plan.md`

---

## Final verification

- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [x] `bunx vitest run src/lib/pipeline/store-sync.test.ts` passes
- [ ] `bun run stores:sync` runs successfully against a dev database
- [ ] Re-running the sync with unchanged source data produces no duplicate stores
- [ ] Simulating a removed store in test data sets `active = false`
- [ ] All output files exist per `plan.md`
- [ ] Update `plan.md` status from `pending` to `done`

---

## Manual E2E Testing

- [ ] Run `bun run db:seed` against a local or dev database and confirm `stores` is populated
- [ ] Run `bun run stores:sync` twice and confirm the second run reports no duplicate inserts
- [ ] Verify that a store removed from a fixture source is soft-deactivated, not deleted
- [ ] Verify that a previously inactive store is reactivated when it reappears in source
- [ ] Confirm the GitHub Actions workflow only needs `DATABASE_URL` to execute

---

## Notes

- Prefer the processed JSON source over CSV to avoid adding a parser dependency
- Keep the sync logic framework-agnostic; this is a shared pipeline, not a `createServerFn`
- `syncStores()` should receive its DB dependency from the caller; it should not instantiate Drizzle or read env
- Do not hard-delete stores because `chicken_sightings` will reference them
- The current repo has no `scripts/` directory yet; this feature establishes that pattern
- `src/lib/env.ts` is app-layer config only; standalone scripts should not depend on it
