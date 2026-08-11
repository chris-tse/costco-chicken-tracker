# 015 — Complete a Sighting with Optional Doneness

## Source

GitHub issue [#15](https://github.com/chris-tse/costco-chicken-tracker/issues/15),
the Save-then-enrich checkpoint from [#12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).

## Scope

1. Present a focused, full-screen completion state only after an initial create returns its
   durable sighting.
2. Identify the literal saved label time and let the tracker set `light`, `medium`, `dark`,
   or clear doneness with a targeted durable update.
3. Keep completion open while enrichment runs, preserve the initial save on update failure,
   and return to fresh Capture through Done.

## Test seams

- Capture route behavior through React Testing Library with injected create and doneness-update
  operations.
- The explicit doneness-update operation through disposable real PostgreSQL after applying the
  committed baseline migration.

## Verification

Run focused route and persistence suites during development, followed by lint, typecheck, all
Vitest suites (including PostgreSQL), and the production build.
