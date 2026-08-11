# 013 — Private Application Shell

## Source

GitHub issue [#13](https://github.com/chris-tse/costco-chicken-tracker/issues/13),
which implements the first checkpoint of the current specification in [#12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).

## Scope

1. Remove the superseded authentication, store, location, moderation, and
   synchronization surfaces and their dependencies, scripts, tests, schema, and
   generated migrations.
2. Leave a publicly reachable, private application shell with no unfinished
   destination links.
3. Keep generic TanStack Start/Vite, UI tokens, Drizzle/PostgreSQL, and
   Vitest/React Testing Library foundations usable.
4. Replace active product documentation with the resolved specification and
   seven-ticket delivery graph; preserve older feature plans as history.

## Verification

Run lint, typecheck, the Vitest suite, and the production build. Confirm the
generated route tree exposes only the root application route.
