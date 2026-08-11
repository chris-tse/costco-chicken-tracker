# Onboarding

Chicken Tracking is a TanStack Start application with strict TypeScript,
Tailwind CSS v4, Drizzle/PostgreSQL, Vitest, and React Testing Library. It is a
private single-user tool; do not add application authentication or location
features unless a later approved ticket changes the product specification.

Read [`CONTEXT.md`](../CONTEXT.md), [`PRD.md`](PRD.md), and
[`decisions.md`](decisions.md) before making product changes.

## Local development

```bash
bun install
export DATABASE_URL="postgres://..."
bun run dev
```

Useful commands:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run acceptance:container
bun run db:generate
bun run db:migrate
bun run db:studio
```

Routes live in `src/app/`; `src/routeTree.gen.ts` is generated and must not be
edited manually. Database schema lives in `src/lib/db/schema.ts`. The only
required server environment variable is `DATABASE_URL`.

`bun run acceptance:container` additionally requires Docker and a Playwright browser. It creates
its own disposable PostgreSQL 17 container, so do not point it at a personal or production
database. It does not substitute for the separately recorded physical iPhone/Safari or named
Chrome-version checks in [the MVP acceptance record](acceptance/2026-08-11-mvp.md).

## Historical migration notes

The TanStack migration record is retained at
[`docs/history/TANSTACK_MIGRATE.md`](history/TANSTACK_MIGRATE.md). It documents a
completed framework migration and is not current product guidance.
