---
status: pending
---

# 002 — Auth Setup

## Phase
1 — Foundation

## Goal
Set up Better Auth with Google OAuth, Drizzle adapter, invite-code-gated signup, and auth middleware. Users can sign up (with invite code), sign in, and sign out.

## Prerequisites
- 001-database-setup (Drizzle schema and DB client must exist)

## References
- `docs/PRD.md` lines 130-137 — auth flow spec
- `docs/PRD.md` lines 82-92 — `invite_codes` schema
- `docs/PRD.md` lines 72-81 — `users` schema
- Better Auth docs: https://www.better-auth.com/docs
- Better Auth Drizzle adapter docs: https://www.better-auth.com/docs/adapters/drizzle

## Scope

### 1. Install dependencies
- `better-auth` — core auth library
- Research: does Better Auth require additional peer deps for the Drizzle adapter or Google OAuth provider?

### 2. Configure Better Auth server
- Location: `src/lib/auth.ts`
- Configure:
  - Database: use the Drizzle adapter, pointing to the `db` instance from 001
  - Social provider: Google OAuth (`clientId`, `clientSecret` from env)
  - Session: configure session strategy (JWT or database sessions — research Better Auth defaults)
  - Cookie plugin: `tanstackStartCookies()` from `better-auth/tanstack-start` (replaces Next.js `nextCookies()`)
- Better Auth may create its own tables (sessions, accounts, etc.) — research how these interact with the existing `users` table from 001. May need to either:
  - (a) Let Better Auth manage its own user table and link to the app's `users` table, OR
  - (b) Configure Better Auth to use the existing `users` table schema
  - Document the chosen approach and any schema adjustments needed

### 3. Create auth API route
- Location: `src/app/api/auth/$.ts` (TanStack Start catch-all route)
- Mount Better Auth's request handler using `createFileRoute("/api/auth/$")` with `server.handlers`
- This handles OAuth callbacks, session management, etc.
- **Note:** This route was already scaffolded during the TanStack migration; verify the import path points to the final auth config location

### 4. Create auth protection via route guard
- Location: `src/app/_protected.tsx` (pathless layout route)
- Use `beforeLoad` hook with `getSession` server function to check auth
- Protected pages go under `src/app/_protected/` directory
- Allow public access to: `/`, `/sign-in`, `/sign-up`, `/api/auth/*` (outside the protected layout)
- Redirect unauthenticated users to `/sign-in` via `throw redirect({ to: "/sign-in" })`
- **Note:** This replaces the Next.js `proxy.ts` / `middleware.ts` pattern. TanStack Start uses per-route `beforeLoad` guards instead of global middleware.

### 5. Build sign-up page
- Location: `src/app/sign-up.tsx` (TanStack route)
- Flow:
  1. Route reads `?code=abc123` from search params via `validateSearch` + `Route.useSearch()`
  2. Validate invite code via a server function against `invite_codes` table:
     - Code exists
     - Code has not been used (`used_by` is null)
     - Code has not been revoked (`revoked_at` is null)
  3. If code invalid → show error message, no signup form
  4. If code valid → show Google OAuth sign-up button
  5. On successful OAuth completion:
     - Create user record
     - Mark invite code as used (`used_by`, `used_at`)
     - Redirect to home/onboarding
- Sign-up button component at `src/app/-components/sign-up-button.tsx`

### 6. Build sign-in page
- Location: `src/app/sign-in.tsx` (TanStack route)
- Simple page with Google OAuth sign-in button
- Redirect to home on success
- Show error state if auth fails

### 7. Auth client utilities
- Location: `src/lib/auth-client.ts`
- Export client-side auth helpers (session hook, sign-out function)
- Use Better Auth's client-side API
- Research: `createAuthClient` from `better-auth/react` or similar

### 8. Session access in routes
- Session data is accessed via `getSession` server function (from `src/lib/auth.server.ts`)
- For route loaders: call `getSession()` in the route's `loader` or `beforeLoad`
- For client components: use `useSession()` from `src/lib/auth-client.ts`
- No session provider wrapper needed in the root layout

### 9. Environment variables
- Add to `.env.example`:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `BETTER_AUTH_SECRET` (or equivalent session signing secret)
  - `BETTER_AUTH_URL` (base URL for auth callbacks)

## Key Decisions to Research
- How Better Auth's user table maps to the app's `users` table (merge or link?)
- Whether Better Auth's Drizzle adapter auto-creates tables or needs manual schema definitions
- Session strategy: JWT vs database sessions (tradeoffs for this app)
- How to pass the invite code through the OAuth flow (state parameter? cookie? session?)

## TanStack Start Migration Notes
The following changes were made to this plan after migrating from Next.js to TanStack Start:
- **Cookie plugin:** `nextCookies()` → `tanstackStartCookies()` from `better-auth/tanstack-start`
- **API route:** `app/api/auth/[...all]/route.ts` + `toNextJsHandler` → `src/app/api/auth/$.ts` with `server.handlers`
- **Auth middleware:** `proxy.ts` (Next.js 16) → `_protected.tsx` pathless layout with `beforeLoad` guard
- **Page pattern:** Server Components + Client Components → TanStack routes with `createFileRoute`
- **Server actions:** Next.js server actions → `createServerFn` from `@tanstack/react-start`
- **File paths:** `app/` → `src/app/`, `lib/` → `src/lib/`

## Verification
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- OAuth flow works end-to-end in dev:
  - Visit `/sign-up?code=VALID_CODE` → see sign-up button
  - Visit `/sign-up?code=INVALID` → see error
  - Complete OAuth → user created, invite code marked used
  - Visit `/sign-in` → sign in with existing account
  - Protected routes redirect to `/sign-in` when unauthenticated
- Write tests for invite code validation logic

## Output
- `src/lib/auth.ts` (server config)
- `src/lib/auth-client.ts` (client utilities)
- `src/lib/auth.server.ts` (server-side session helpers — already scaffolded)
- `src/app/api/auth/$.ts` (already scaffolded during TanStack migration)
- `src/app/sign-up.tsx`
- `src/app/-components/sign-up-button.tsx`
- `src/app/sign-in.tsx`
- `src/app/_protected.tsx` (auth route guard)
- Updated `src/lib/db/schema.ts` (Better Auth table additions)
- Updated `.env.example`
