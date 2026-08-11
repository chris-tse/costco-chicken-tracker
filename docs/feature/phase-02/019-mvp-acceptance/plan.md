# #19 — Complete MVP acceptance and documentation reconciliation

## Source

GitHub issues [#19](https://github.com/chris-tse/costco-chicken-tracker/issues/19) and
[#12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).

## Goal

Produce a reproducible handoff for the assembled private, mobile-first MVP. The handoff must
exercise the released container with isolated PostgreSQL data, preserve honest limits where
the environment cannot provide a physical device or browser version, and make the active
documentation describe only the delivered product.

## Acceptance seams

- `bun run acceptance:container` builds the image, creates an isolated PostgreSQL 17 database,
  starts the migrated container, and runs the browser journey against it.
- `scripts/acceptance-journey.mjs` checks the complete Capture/Completion/Correction/Recent/
  Plan journey at both 375px and 430px portrait viewports. It includes a reload before
  enrichment, an intercepted enrichment failure, keyboard/focus behavior, target dimensions,
  landmarks, labels, headings, live status regions, and horizontal-overflow checks.
- Unit and integration suites remain the focused seams for client-clock boundaries, database
  constraints, failures, planner calculations, and operation contracts.
- The versioned acceptance record names the exact command and external acceptance evidence that
  was or was not available; browser or device results are never inferred from emulation.

## Verification

Run `bun install --frozen-lockfile`, `bun run lint`, `bun run typecheck`, `bunx vitest run`,
`bun run build`, and `bun run acceptance:container`. The final command includes real
PostgreSQL, migration, startup, health, image, and browser checks.

## External acceptance

A physical iPhone 15 Pro running current Safari and current plus immediately previous Chrome
remain explicit external checks. The record may mark them passed only after each run is
performed on that named device/browser against the resettable PostgreSQL environment.
