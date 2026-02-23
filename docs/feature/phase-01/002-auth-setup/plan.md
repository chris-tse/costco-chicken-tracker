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
- Location: `lib/auth/index.ts` (or `lib/auth.ts`)
- Configure:
  - Database: use the Drizzle adapter, pointing to the `db` instance from 001
  - Social provider: Google OAuth (`clientId`, `clientSecret` from env)
  - Session: configure session strategy (JWT or database sessions — research Better Auth defaults)
- Better Auth may create its own tables (sessions, accounts, etc.) — research how these interact with the existing `users` table from 001. May need to either:
  - (a) Let Better Auth manage its own user table and link to the app's `users` table, OR
  - (b) Configure Better Auth to use the existing `users` table schema
  - Document the chosen approach and any schema adjustments needed

### 3. Create auth API route
- Location: `app/api/auth/[...all]/route.ts`
- Mount Better Auth's request handler for all auth routes
- This handles OAuth callbacks, session management, etc.

### 4. Create auth middleware
- Location: `middleware.ts` (project root)
- Protect authenticated routes
- Allow public access to: `/`, `/sign-in`, `/sign-up`, `/api/auth/*`
- Redirect unauthenticated users to `/sign-in`
- Research: Better Auth's recommended middleware pattern for Next.js App Router

### 5. Build sign-up page
- Location: `app/sign-up/page.tsx`
- Flow:
  1. Page reads `?code=abc123` from URL search params
  2. Validate invite code against `invite_codes` table (server-side):
     - Code exists
     - Code has not been used (`used_by` is null)
     - Code has not been revoked (`revoked_at` is null)
  3. If code invalid → show error message, no signup form
  4. If code valid → show Google OAuth sign-up button
  5. On successful OAuth completion:
     - Create user record
     - Mark invite code as used (`used_by`, `used_at`)
     - Redirect to home/onboarding
- This page should be a Server Component with the OAuth button as a Client Component

### 6. Build sign-in page
- Location: `app/sign-in/page.tsx`
- Simple page with Google OAuth sign-in button
- Redirect to home on success
- Show error state if auth fails

### 7. Auth client utilities
- Location: `lib/auth/client.ts`
- Export client-side auth helpers (session hook, sign-out function)
- Use Better Auth's client-side API
- Research: `createAuthClient` from `better-auth/react` or similar

### 8. Session provider / layout integration
- Wrap the app in any required auth provider in `app/layout.tsx`
- Make session data available to Server Components and Client Components

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
- `lib/auth/index.ts` (server config)
- `lib/auth/client.ts` (client utilities)
- `app/api/auth/[...all]/route.ts`
- `app/sign-up/page.tsx`
- `app/sign-in/page.tsx`
- `middleware.ts`
- Updated `lib/db/schema.ts` (if Better Auth requires schema additions)
- Updated `.env.example`
