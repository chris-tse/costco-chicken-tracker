# #19 research notes

## 2026-08-11 — acceptance inventory

- Issue #19 depends on #18 and is the final checkpoint for issue #12.
- The repository already has route-level React Testing Library coverage for clock defaults,
  Save-then-enrich ordering and failure, correction/cancel/delete, recency, Plan empty and
  sparse states, semantic controls, focus, and narrow layout. Its PostgreSQL integration suite
  uses the public sighting operation contract against the committed baseline migration.
- `scripts/container-smoke.sh` already proves image build, fail-closed migration/startup,
  database-aware health, Capture, and Plan against disposable PostgreSQL 17. The final checkpoint
  expands its browser smoke into a resettable, full assembled journey.
- This agent environment has no Docker client/daemon, PostgreSQL client/server, Chrome binary,
  iPhone/Safari device bridge, or T3 preview automation host. It cannot truthfully generate
  physical-iPhone/Safari or current/previous-Chrome acceptance evidence. CI runs the Docker and
  Playwright portion; any physical/device/browser result remains an external release blocker.

## 2026-08-14 — physical failure-path timing

- A physical iPhone 15 Pro/Safari run against the isolated local PostgreSQL 17 fixture confirmed
  that a label time remains durable when optional doneness enrichment fails.
- Stopping PostgreSQL made the doneness request remain in its saving state for an unacceptably
  long time before the retryable error appeared. The completion UI had no request deadline.
- TanStack Start server functions accept an `AbortSignal` and pass it to their underlying fetch.
  The doneness enrichment request can therefore be canceled at the transport boundary after five
  seconds while keeping the already-created sighting recoverable.
