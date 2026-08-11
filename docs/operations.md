# Self-hosted operations

Chicken Tracking is a stateless, plain-HTTP application container. It uses an
operator-provided PostgreSQL database through `DATABASE_URL`; it does not create a database,
manage storage volumes, terminate TLS, or decide who may access the application.

## Image releases

The public image is published to GitHub Container Registry:

```text
ghcr.io/chris-tse/costco-chicken-tracker
```

The publishing workflow applies:

- `latest` for the current `main` release only;
- `sha-<12-character-commit>` for every published commit; and
- a release tag such as `v1.2.3` when the corresponding Git tag is pushed.

All tags are movable convenience references, including SHA and release tags. Only a container
digest identifies immutable image content. Production deployments must pin an image digest and
record it in deployment configuration. Retain the previous known-good image digest until the
new release has been proven healthy.

```bash
docker pull ghcr.io/chris-tse/costco-chicken-tracker@sha256:<published-digest>
docker run --rm -p 3000:3000 \
  --env DATABASE_URL="postgresql://app_user:password@postgres.example:5432/chicken_tracking" \
  ghcr.io/chris-tse/costco-chicken-tracker@sha256:<published-digest>
```

The process listens on plain HTTP port `3000`. Mount no data volume: durable state belongs only
in PostgreSQL. `DATABASE_URL` is the only required secret. `PORT` and `HOST` are optional
non-secret environment settings; the image defaults to `3000` and `0.0.0.0`.

## Startup, migration, and health

The default `serve` command applies the committed, forward-only migrations before starting the
web process. A PostgreSQL advisory lock serializes migration discovery and application across
concurrently starting containers. A missing `DATABASE_URL`, inability to reach PostgreSQL,
migration-history hash drift, or migration error causes the process to exit without serving HTTP.

Use the standalone command for manual recovery or a controlled migration step:

```bash
docker run --rm \
  --env DATABASE_URL="postgresql://app_user:password@postgres.example:5432/chicken_tracking" \
  ghcr.io/chris-tse/costco-chicken-tracker@sha256:<published-digest> migrate
```

`GET /health` returns `200 {"status":"ok"}` only when both the web process and PostgreSQL are
available. It returns `503 {"status":"unavailable"}` after a database connectivity failure.
Use that endpoint for readiness/load-balancer checks; do not use a bare TCP check as proof that
the application is ready.

Migrations are committed and forward-only. Each release must keep its migrations compatible
with the immediately preceding app release. This release adds no schema change, so it can be
deployed or rolled back alongside the preceding Capture-and-Plan release. Future schema changes
must use additive/compatible expansion before a later cleanup release; never rely on an image
rollback to reverse an already-applied migration.

The migrator treats the timestamp in a committed migration directory as its identity and stores
the SHA-256 content hash. It rejects malformed or colliding migration identities, duplicate
applied identities, and any mismatch between an applied hash and the image's committed file.
Never edit, rename, or reuse a committed migration after it has reached an environment; add a
new forward migration instead.

## Rollout and rollback

1. Record the running digest as the rollback target and choose a new pinned digest.
2. Run the new image's `migrate` command against the production database, or allow its
   fail-closed startup to do the same. Concurrent starts wait on the PostgreSQL migration lock.
3. Start the new image, wait for `/health` to return 200, then send gateway traffic to it.
4. Confirm Capture and Plan work through the private gateway before retiring the previous
   image.
5. If the new process is unhealthy and the schema remains compatible, route traffic back to the
   retained previous digest. Investigate before retrying. Do not restore a database only to undo
   an application image rollout.

## Gateway and private access

The container intentionally does not terminate TLS or implement access control. The operator's
private gateway owns:

- TLS certificates and HTTPS redirects;
- private-network/firewall policy and authentication if required;
- routing public/private traffic to the container's HTTP port `3000`; and
- health checks against `/health`.

Do not expose PostgreSQL publicly or publish the app container directly to the internet without
a private-access policy at the gateway.

## PostgreSQL, backups, and restore

Provision PostgreSQL separately with a database owner role that is reachable from the app's
private network. The default startup path runs migrations as `DATABASE_URL`, so this role needs
to create the `drizzle` schema and migration table and execute every committed migration's DDL.
It is intentionally not a DML-only least-privilege role. Keep that authority bounded to this
dedicated application database: do not grant superuser, `CREATEDB`, `CREATEROLE`, or access to
other application databases.

For example, an administrator can create a dedicated non-superuser owner once, then use that
role in the sole required `DATABASE_URL` secret:

```sql
CREATE ROLE chicken_tracking LOGIN PASSWORD '<generated-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
CREATE DATABASE chicken_tracking OWNER chicken_tracking;
```

The image's smoke test exercises this non-superuser-owner workflow. Store `DATABASE_URL` in the
platform's secret manager; never bake it into an image, commit it, or place it in a URL that
appears in logs.

Take logical or physical PostgreSQL backups at least daily, retain at least seven daily restore
points, and monitor backup completion and storage capacity. The backup system is the operator's
responsibility, including encryption and off-site/durable storage when appropriate.

Test this restore path on a non-production database at least before the first production rollout
and after materially changing PostgreSQL, backup tooling, or migration policy:

1. Create a fresh, isolated PostgreSQL database from a selected backup.
2. Run the pinned app image's standalone `migrate` command against that restored database.
3. Start the same pinned image and confirm `/health` is 200.
4. Verify a representative Capture save and a Plan read; record the backup identifier, image
   digest, date, and result in the operations log.

For a production recovery, stop writes and gateway traffic first, restore to a new database (or
the provider-approved recovery target), run the pinned image's migration command, verify health
and the Capture/Plan smoke journey privately, then update `DATABASE_URL` and re-enable gateway
traffic. Preserve the failed database until the recovery is accepted so forensic investigation
and an alternate restore point remain possible.
