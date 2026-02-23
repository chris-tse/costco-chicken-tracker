# Project Decisions

## 2026-02-22

### t3-env for env var validation
Using `@t3-oss/env-nextjs` for runtime env validation with Zod schemas.
**Why:** Catches missing env vars at build time, type-safe access, integrates well with Next.js.

### Drizzle beta over stable
Using `drizzle-orm@beta` for the newer relations API.
**Why:** The stable relations API has rough edges; beta API is significantly cleaner.
Consider revisiting when beta graduates to stable.
**Risk:** Beta — potential for breaking changes.
