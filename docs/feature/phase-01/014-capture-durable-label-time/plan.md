# 014 — Capture and Durably Save Label Time

## Source

GitHub issue [#14](https://github.com/chris-tse/costco-chicken-tracker/issues/14),
the durable Capture checkpoint from [#12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).

## Scope

1. Introduce the fresh `sightings` schema and a baseline PostgreSQL migration.
2. Expose one validated, explicit create operation that returns the complete durable sighting.
3. Replace the shell with mobile-first Capture, defaulted from the device clock, with literal
   label-date/minute entry, non-blocking store-hours warning, validation, progress, success,
   and recoverable persistence failure states.

## Test seams

- Capture route behavior, observed through React Testing Library with a controlled clock and
  injected save operation.
- The explicit sighting-create operation, observed against disposable real PostgreSQL after
  applying the committed baseline migration.

## Verification

Run lint, typecheck, all Vitest suites (including the PostgreSQL integration suite in CI), and
the production build.
