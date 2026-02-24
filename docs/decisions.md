# Project Decisions

## 2026-02-22

### t3-env for env var validation
Using `@t3-oss/env-core` for runtime env validation with Zod schemas.
**Why:** Catches missing env vars at build time, type-safe access. Switched from
`@t3-oss/env-nextjs` to the framework-agnostic `@t3-oss/env-core` during TanStack
migration.

### Drizzle beta over stable
Using `drizzle-orm@beta` for the newer relations API.
**Why:** The stable relations API has rough edges; beta API is significantly cleaner.
Consider revisiting when beta graduates to stable.
**Risk:** Beta — potential for breaking changes.

## 2026-02-23

### Extend existing `users` table for Better Auth (002-auth-setup)
Better Auth requires a `user` table with specific columns (`email_verified`, `updated_at`).
Rather than maintaining a separate Better Auth user table linked to the app's `users` table,
we extend the existing `users` table with the missing columns and use Better Auth's
`usePlural: true` + `additionalFields` config to register app-specific columns
(`default_store_id`, `commute_minutes`, `trust_score`).
**Why:** Single source of truth, simpler queries, no cross-table sync. Better Auth's Drizzle
adapter natively supports this pattern. Separate tables only make sense when migrating from
another auth system where the user table can't be modified.

### Database sessions over JWT (002-auth-setup)
Using Better Auth's default database session strategy (cookie-based with a `sessions` table)
rather than stateless JWT.
**Why:** Better Auth defaults to database sessions. For this app there's no compelling reason
to go stateless -- the app already has a database, session revocation is simpler, and cookie
caching can be layered on later if performance matters.

### `proxy.ts` over `middleware.ts` (002-auth-setup) — SUPERSEDED
~~Project uses Next.js 16.1.6 which renames the middleware convention to `proxy.ts`.~~
**Superseded by TanStack migration:** Auth protection now uses a `_protected.tsx`
pathless layout route with `beforeLoad` + `getSession` pattern instead.

### Pre-OAuth cookie for invite code persistence (002-auth-setup)
The invite code must survive the Google OAuth redirect (user leaves the site, returns via
callback). We store the invite code in a short-lived HTTP-only cookie before initiating OAuth,
then validate and consume it in Better Auth's `databaseHooks.user.create` hooks.
**Why:** Alternatives considered:
- *Post-signup gate:* Creates unauthorized user accounts that must be cleaned up. Weaker security.
- *Defer entirely:* Changes the PRD-specified flow. Harder to retrofit later.
- *OAuth state parameter:* Better Auth doesn't expose direct control over the OAuth state param.
The cookie approach is ~10 lines of code, secure (HTTP-only, short TTL), and matches industry
patterns (Stripe, Linear, etc.).

### Minimal Tailwind UI for auth pages (002-auth-setup)
Building sign-in/sign-up pages with plain Tailwind utility classes rather than waiting for
003-shadcn-ui-init.
**Why:** Unblocks auth work. Pages can be restyled once the component library is in place.

### Migrate from Next.js App Router to TanStack Start
Replaced the Next.js (App Router) framework with TanStack Start (Vite-based) before
building any application features beyond the initial database setup.
**Why:** Vite-based build system is faster and more flexible. TanStack Start provides
file-based routing with explicit route definitions (`createFileRoute`), route loaders,
and server functions — offering better control over data fetching and auth patterns.
Better Auth has first-class TanStack Start support via `tanstackStartCookies()`.
The project was still in early scaffolding (no custom pages), making this the ideal
time to migrate with minimal rewrite cost.
**Impact on prior decisions:**
- `proxy.ts` (Next.js 16 middleware) → `_protected.tsx` pathless layout with `beforeLoad` guard
- `nextCookies()` → `tanstackStartCookies()` from `better-auth/tanstack-start`
- `toNextJsHandler` → `server.handlers` pattern in TanStack Start routes
- Server Components / Client Components → route loaders + `createServerFn`
- ESLint removed entirely; Biome/Ultracite is the sole linter
- Tailwind CSS switched from PostCSS plugin to Vite plugin

### Auth config at `src/lib/auth.ts` not `src/lib/auth/index.ts` (002-auth-setup)
The plan originally specified `src/lib/auth/index.ts` with a directory structure, but we
kept a flat `src/lib/auth.ts` file.
**Why:** Better Auth's CLI and docs expect `auth.ts` in `lib/` by convention. A directory
adds indirection for no benefit. Client utilities live at `src/lib/auth-client.ts`
(following the Better Auth docs pattern of `lib/auth-client.ts`) since `src/lib/auth/`
as a directory would conflict with the `src/lib/auth.ts` file on the filesystem.

### Environment-scoped DATABASE_URL with PlanetScale branching
Using Vercel's environment variable scoping to point Production and Preview deployments
at different PlanetScale branches. Production uses the `main` PlanetScale branch; Preview
(PR deployments) and local Development use a shared `dev` branch.
**Why:** PlanetScale branches provide isolated databases with independent schemas and data.
Scoping `DATABASE_URL` by Vercel environment (Production vs Preview vs Development) ensures
PR previews never touch production data, without any CI automation or per-PR branch
orchestration. Combined with `t3-env` validation, missing or misconfigured URLs are caught
at build time.
**Setup:**
- `DATABASE_URL` scoped to **Production** → PlanetScale `main` branch connection string
- `DATABASE_URL` scoped to **Preview** → PlanetScale `dev` branch connection string
- `.env.local` for local development → same `dev` branch (or a local DB)
**Alternatives considered:**
- *Per-PR PlanetScale branches via GitHub Actions:* Full schema isolation per PR, but adds
  CI complexity (branch creation, cleanup, credential wiring). Overkill at current scale.
  Revisit if schema migrations start conflicting across concurrent PRs.
- *Single DATABASE_URL for all environments:* Simpler but risks preview deployments
  corrupting production data.

### Separate BETTER_AUTH_SECRET per environment
Each Vercel environment (Production, Preview, Development) uses its own `BETTER_AUTH_SECRET`.
**Why:** Sessions are database-backed, so the secret is used for cookie signing. If a dev
secret leaks (`.env.local` shared in chat, committed accidentally), an attacker could forge
valid session cookies for production. Separate secrets ensure cross-environment session
isolation — a session created in preview cannot be used in production, and vice versa.

### Derive BETTER_AUTH_URL from VERCEL_URL on preview deployments
`BETTER_AUTH_URL` is set explicitly only for Production (custom domain) and local dev
(`.env.local`). On Vercel Preview deployments, `baseURL` is derived from the `VERCEL_URL`
environment variable that Vercel injects automatically.
**Why:** Preview URLs are dynamic (`<project>-<hash>-<team>.vercel.app`) so there's no
single value to hardcode. The fallback chain in `getBaseURL()` (`src/lib/auth.ts:20-28`)
resolves as: `BETTER_AUTH_URL` → `https://${VERCEL_URL}` → `http://localhost:3000`.
`BETTER_AUTH_URL` was made optional in `env.ts` and `VERCEL_URL` added as an optional
string to support this pattern.
**Impact:** `env.ts` — `BETTER_AUTH_URL` changed from `z.url()` to `z.url().optional()`,
`VERCEL_URL` added as `z.string().optional()`.

### Better Auth admin plugin for role-based access (002-auth-setup)
Using Better Auth's `admin()` plugin instead of a manual role column + custom
middleware for admin route gating.
**Why:** The admin plugin provides a `role` column on the `user` table (defaulting
to `"user"`), server-side role helpers, and a client-side `adminClient()` plugin
with typed role access on the session — all out of the box. This avoids hand-rolling
role checks, keeps the session type augmented automatically, and aligns with Better
Auth's plugin ecosystem. Admin routes use a `_protected/_admin.tsx` pathless layout
that checks `session.user.role !== "admin"` in `beforeLoad`.
**Alternative considered:**
- *Manual `role` text column + custom guard logic:* Full control, but duplicates what
  the plugin already does. The plugin also handles edge cases (role validation, admin
  API endpoints) that would need to be built manually.

### Separate Google OAuth clients per environment
Production and local development use different Google OAuth client credentials
(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). Preview deployments do not have
Google OAuth configured — OAuth is not functional on previews.
**Why:** Google OAuth redirect URIs are tied to a specific domain. Production uses the
custom domain; local dev uses `http://localhost:3000`. Google does not support wildcard
redirect URIs, so dynamic Vercel preview URLs (`<project>-<hash>.vercel.app`) cannot be
covered without adding each one manually. Accepting that OAuth doesn't work on preview
deployments is the standard trade-off — auth flows are tested locally instead.
**Setup:**
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` scoped to **Production** → production OAuth client (redirect URI: `https://yourdomain.com/api/auth/callback/google`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env.local` → dev OAuth client (redirect URI: `http://localhost:3000/api/auth/callback/google`)
- **Preview** → not set; OAuth sign-in will not work on PR preview deployments
**Alternative considered:**
- *Stable preview subdomain (e.g. `preview.yourdomain.com`):* Would allow a single OAuth
  client to cover previews, but adds DNS/routing infrastructure for little benefit at this stage.

## 2026-02-28

### No nested pathless `_admin` layout — inline admin check per route (002-auth-setup)
The plan called for `src/app/_protected/_admin.tsx` as a nested pathless layout to gate admin
routes. The TanStack Router generator (v1.162.6) rejects a standalone pathless layout with no
children: both `_protected` and `_admin` strip their path segments, so the generator infers the
route's full path as `/`, conflicting with `src/app/index.tsx`.
**Decision:** Skip the `_admin` layout. Admin-gated routes live directly under
`src/app/_protected/` with an inline `beforeLoad` that checks `session?.user.role !== "admin"`
and redirects to `/` if the check fails. The first such route is `/dashboard`
(`src/app/_protected/dashboard.tsx`).
**Alternative considered:**
- *Nested `_admin` layout with a real child route:* Would work once a child with a non-empty
  path segment exists, but adds a layer of indirection for minimal benefit at this stage. Can be
  revisited if many admin routes are added.
