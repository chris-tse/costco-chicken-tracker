# 013 — Private Application Shell Research

## 2026-08-11

- Issue #13 is the first implementation checkpoint in the seven-ticket graph
  specified by #12.
- Existing `docs/feature/phase-01` through `phase-06` described the superseded
  crowdsourced, multi-user product. They are retained under `docs/history/` so
  they cannot be mistaken for current delivery guidance.
- The clean shell intentionally contains no Capture, Plan, history, correction,
  sign-in, or admin route. Capture begins in #14 after the fresh persistence
  contract is introduced.
- Drizzle configuration and the PostgreSQL client remain. The old schema and
  migrations are deliberately removed; #14 introduces the fresh `sightings`
  schema and baseline migration.
