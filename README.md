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
