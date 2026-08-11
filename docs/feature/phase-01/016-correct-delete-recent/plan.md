# 016 — Correct, Delete, and Review Recent Sightings

## Source

GitHub issue [#16](https://github.com/chris-tse/costco-chicken-tracker/issues/16), the
correction/deletion/recent checkpoint from [#12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).

## Scope

1. Show exactly three recent sightings, ordered by immutable creation instant descending and
   identity descending, on Capture.
2. Add one identity-addressed, full-screen correction route shared by a completion action and
   recent-sighting actions. It replaces label date, literal label minute, and nullable doneness
   as one persistence operation.
3. Support explicit cancellation, retryable correction/deletion failures, stable not-found
   states, and confirmed hard deletion without adding a general history or patch surface.

## Test seams

- Capture, completion, and correction route behavior through React Testing Library with injected
  sighting operations.
- Recent lookup, complete correction, and hard deletion through public sighting operations
  against disposable real PostgreSQL after the committed baseline migration.

## Verification

Run focused route and persistence suites during development, then lint, typecheck, full Vitest
(including PostgreSQL when `DATABASE_URL` is configured), generated-diff checks, and production
build before publishing.
