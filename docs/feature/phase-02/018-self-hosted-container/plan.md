# #18 — Run the assembled app as a self-hosted container

## Goal

Deliver the assembled Capture and Plan application as one stateless OCI image. The image
owns the application process and committed Drizzle migrations; the operator owns PostgreSQL,
private routing, TLS, access policy, backups, and restore operations.

## Confirmed operations seams

- `docker run <image>` is the fail-closed serving seam: `DATABASE_URL` is required,
  migrations complete first, and only then does HTTP start.
- `docker run <image> migrate` is the recovery seam for applying committed migrations
  without starting the web process.
- `GET /health` is the readiness seam: it succeeds only while PostgreSQL is reachable.
- The assembled HTTP seam proves Capture (`/`) and Plan (`/plan`) are served from the
  migrated container against an operator-provided disposable PostgreSQL instance.

## Delivery slices

1. Add a database-aware health route and a migration entrypoint that has no application
   configuration besides `DATABASE_URL`.
2. Package build output, migration bundle, and committed migration files in a non-root,
   plain-HTTP OCI image with fail-closed startup and standalone migration mode.
3. Add black-box container verification and CI coverage, then public GHCR publication for
   `latest`, immutable SHA, and immutable release-version tags.
4. Document pinned deployments, rollback, gateway responsibility, provisioning, backups,
   seven-day retention, tested restore, and recovery.

## Compatibility

This ticket adds runtime/deployment behavior only. It does not alter the existing baseline
schema, so the current image remains forward-compatible with the immediately preceding app
release and can be rolled back after a successful #18 deployment.
