# 017 — Plan a Visit from Historical Sightings

## Source

GitHub issue [#17](https://github.com/chris-tse/costco-chicken-tracker/issues/17),
the Visit planner checkpoint from [#12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).

## Scope

1. Add the persistent Capture/Plan bottom navigation and a client-clock-defaulted `/plan` route.
2. Add one deterministic, distinct literal-weekday evidence read to the explicit sighting
   operations contract.
3. Calculate and render the non-probabilistic Visit planner signal immediately from the selected
   weekday and time, including distinct failure, empty, sparse, and comparative states.

## Test seams

- Deterministic pure planner calculation fixtures.
- Plan route behavior through React Testing Library with a controlled client clock and injected
  weekday-evidence read.
- Public weekday-evidence operation against disposable real PostgreSQL.

## Verification

Run lint, typecheck, all Vitest suites (including PostgreSQL integration when configured), the
production build, generated-route diff check, and Drizzle generation.
