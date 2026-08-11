# Chicken Tracking

A private, mobile-first application for recording the printed label time of a
rotisserie chicken, optionally noting doneness, and learning from accumulated
sightings. Application access belongs at a private gateway; the app has no
account or location model.

The current product specification is [issue #12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).
The implementation starts with the private application shell in [issue #13](https://github.com/chris-tse/costco-chicken-tracker/issues/13).

## Development

```bash
bun install
export DATABASE_URL="postgres://..."
bun run dev
```

Run the automated checks with `bun run lint`, `bun run typecheck`, `bun run test`,
and `bun run build`.

`DATABASE_URL` is the only required application secret. PostgreSQL provisioning,
backups, private access, TLS, and routing are operator responsibilities.

## Self-hosted container

The production image is a stateless, plain-HTTP OCI container. It runs migrations before
serving and exposes database-aware `GET /health` readiness. Use a pinned GHCR image digest in
production, keep the previous known-good digest for rollback, and provide only `DATABASE_URL`:

```bash
docker run --rm -p 3000:3000 \
  --env DATABASE_URL="postgresql://app_user:password@postgres.example:5432/chicken_tracking" \
  ghcr.io/chris-tse/costco-chicken-tracker@sha256:<published-digest>
```

For a controlled migration/recovery step, append `migrate` to the same command. Full deployment,
gateway, rollback, provisioning, backup, and tested-restore guidance is in
[the self-hosted operations guide](docs/operations.md).
