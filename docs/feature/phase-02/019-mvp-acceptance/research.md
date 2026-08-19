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
- The physical retest exposed a second boundary: aborting the browser request did not cancel a
  PostgreSQL operation already queued in the server pool. After PostgreSQL restarted, that stale
  operation wrote doneness even though Safari had reported failure. Runtime database connection,
  query, and statement deadlines must therefore expire before the browser deadline so a timed-out
  enrichment cannot execute later.

## 2026-08-15 — physical design observations

The completed iPhone 15 Pro portrait journey on the Safari bundled with iOS 27.0 beta was fully
functional. Reference screenshots captured three non-blocking visual-design follow-ups:

- Increase the visual prominence of the outside-store-hours state so it is unmistakably abnormal.
- Present Clear doneness as a smaller secondary/reset action rather than as a fourth full-size
  radio-style choice beside Light, Medium, and Dark.
- Compose the Plan inputs into the sentence itself (for example, “I'm planning on going [weekday]
  at around [time]”) rather than showing a detached summary followed by conventionally labelled
  controls.

No GitHub follow-up issues were created during the PR #26 gate. If these screenshots are later
attached to GitHub issues, publish them through an empty release and use the resulting GitHub-hosted
image URLs rather than local attachment paths.

## 2026-08-15 — outside-hours warning prototype

Question: which visual hierarchy makes an outside-store-hours label time feel unmistakably
abnormal without preventing a valid save?

The throwaway `prototype/outside-store-hours` branch places three treatments in the real Capture
form, switchable with `?hoursVariant=a`, `b`, or `c`. The variants compare an inline caution, a
destructive stop panel, and a compact time-comparison treatment. No production choice has been
made, and saving behavior is unchanged.

After review, the inline caution in variant A was selected as the direction for another prototype
round. Variants B and C now riff on A's light warning palette and non-blocking tone: a contained
soft banner and a compact entered-time/usual-hours comparison. The earlier black-and-amber variant
was removed because its visual association was inappropriate for the product.

Variant A remained the preferred direction. Its left warning rail was removed because the narrow
accent read as a visual "fingernail"; the icon, light warning wash, hierarchy, and copy remain.

The final A treatment was approved for production. The throwaway variant query parameter,
switcher, and unused treatments are not part of the production implementation.

## 2026-08-19 — final handoff audit

- The current assembled candidate, `6144297d2f8d9b1b66cec2336584e1b00186899a`, passed all CI
  jobs on 2026-08-18: 84 tests, build, lint, typecheck, PostgreSQL 17.11 container checks, and
  complete Chrome 152/151 journeys at 375px, 390px, and 430px.
- The image publishing workflow successfully published `latest` and the commit tag, then failed
  while asking its repository-scoped `GITHUB_TOKEN` to change user-package visibility. Package
  visibility is an owner-level setting and the already-public package can be pulled anonymously.
- Final acceptance should verify anonymous access to the just-published immutable commit tag. It
  should not attempt to mutate owner-level package settings on every release.
- Two consecutive PR runs stalled in Playwright's redundant `install --with-deps chromium` step,
  while the workflow's Chrome-for-Testing setup completed and the full current/previous-browser
  journeys passed. The container-smoke job should use that explicit Chrome installation too;
  browser coverage is unchanged and runner package-manager availability is removed from the gate.
- The first post-merge public-image check addressed a full 40-character `github.sha`, but
  Docker Metadata emits the configured 12-character `sha-` tag. Derive the verification tag
  from the first 12 characters of `GITHUB_SHA` so it checks the artifact actually published.
