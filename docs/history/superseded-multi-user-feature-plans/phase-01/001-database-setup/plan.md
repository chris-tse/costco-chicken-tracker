---
status: done
---

# 001 — Database Setup

## Phase
1 — Foundation

## Goal
Establish the database layer: Drizzle ORM schema, PlanetScale Postgres connection, migrations, and a reusable DB client module. Every subsequent feature depends on this.

## Prerequisites
- None (first task in the project)

## References
- `docs/PRD.md` lines 56-112 — canonical SQL schema
- `docs/PRD.md` lines 25-37 — tech stack (Drizzle, PlanetScale Postgres)
- `AGENTS.md` — code style, naming conventions (snake_case DB columns, `@/*` path alias)

## Scope

### 1. Install dependencies
- `drizzle-orm` — ORM
- `drizzle-kit` — migration tooling and Drizzle Studio
- `postgres` (or `@neondatabase/serverless` / appropriate PlanetScale-compatible driver) — research which driver works best with PlanetScale Postgres and Drizzle; the PRD says "PlanetScale Postgres" which is their newer Postgres-compatible product, not the older MySQL-based Vitess product

### 2. Create Drizzle schema file(s)
- Location: `lib/db/schema.ts` (or split per table if preferred)
- Tables to define, matching PRD SQL exactly:

| Table | Key columns | Notes |
|---|---|---|
| `stores` | `id` (serial PK), `external_id` (unique), `name`, `address`, `city`, `state`, `zip`, `lat`, `lng`, `active`, `created_at` | Pre-populated via GHA sync (see 004) |
| `users` | `id` (text PK), `email` (unique), `name`, `image`, `default_store_id` (FK → stores), `commute_minutes`, `trust_score`, `created_at` | `trust_score` defaults to 1.0, used in future phase |
| `invite_codes` | `id` (serial PK), `code` (unique), `created_by` (FK → users), `used_by` (FK → users), `used_at`, `revoked_at`, `created_at` | Note: PRD has `created_by` and `revoked_at` columns that TECH_SPEC lacks — use PRD version |
| `chicken_sightings` | `id` (serial PK), `user_id` (FK → users), `store_id` (FK → stores), `label_time`, `observed_at`, `user_lat`, `user_lng`, `flagged`, `flag_reason`, `admin_reviewed`, `admin_approved`, `algorithm_suggestion`, `doneness`, `notes`, `created_at` | PRD version is canonical — includes `admin_reviewed`, `admin_approved`, `algorithm_suggestion`, `doneness` columns that TECH_SPEC omits |

- Use Drizzle's `pgTable` helper with proper types (`serial`, `text`, `boolean`, `numeric`, `smallint`, `timestamp with time zone`)
- Define relations using Drizzle's `relations()` API
- Export inferred TypeScript types (`InferSelectModel`, `InferInsertModel`) for each table

### 3. Create DB client module
- Location: `lib/db/index.ts`
- Read `DATABASE_URL` from environment
- Export a singleton `db` instance
- Validate that `DATABASE_URL` is set at import time (throw descriptive error if missing)

### 4. Configure Drizzle Kit
- Create `drizzle.config.ts` at project root
- Point schema to `lib/db/schema.ts`
- Configure migration output directory (`drizzle/migrations` or similar)
- Set dialect to `postgresql`

### 5. Generate initial migration
- Run `bunx drizzle-kit generate` to produce the initial SQL migration
- Verify the generated SQL matches the PRD schema intent
- Run `bunx drizzle-kit migrate` (or `push` for dev) to apply

### 6. Add convenience scripts to package.json
- `db:generate` — `drizzle-kit generate`
- `db:migrate` — `drizzle-kit migrate`
- `db:push` — `drizzle-kit push` (for dev iteration)
- `db:studio` — `drizzle-kit studio`

### 7. Create `.env.example`
- Document all required environment variables with placeholder values
- At minimum: `DATABASE_URL`
- Do NOT commit actual secrets

## Schema Divergences Between PRD and TECH_SPEC
The PRD is canonical. Key differences to be aware of:
- `invite_codes`: PRD adds `created_by` and `revoked_at` — use PRD
- `chicken_sightings`: PRD uses `admin_reviewed` + `admin_approved` + `algorithm_suggestion` + `doneness` instead of TECH_SPEC's `flag_resolved` + `approved` — use PRD
- `users`: PRD adds `trust_score` — use PRD

## Verification
- `bunx tsc --noEmit` passes with no errors
- `bunx drizzle-kit generate` produces a valid migration
- `bun run lint` passes
- DB client connects successfully to a local/dev database
- Schema matches PRD SQL (compare column-by-column)

## Output
- `lib/db/schema.ts`
- `lib/db/index.ts`
- `drizzle.config.ts`
- `drizzle/` migrations directory
- `.env.example`
- Updated `package.json` (new deps + scripts)
