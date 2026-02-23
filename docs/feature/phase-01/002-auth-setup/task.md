# 002 Auth Setup — Tasks

Each task below is independently executable. Tasks are ordered by dependency.
Status key: `[ ]` pending, `[~]` in progress, `[x]` done, `[-]` skipped/cancelled.

---

## Task 1: Install dependencies
- [x] Run `bun add better-auth`
- [x] Verify import resolves: `import { betterAuth } from "better-auth"`

**Verify:** `bunx tsc --noEmit` (no unresolved module errors)

---

## Task 2: Update database schema
- [x] Add `email_verified` column to `users` table (boolean, default false)
- [x] Add `updated_at` column to `users` table (timestamptz)
- [x] Add `sessions` table (id text PK, user_id FK, token unique, expires_at, ip_address, user_agent, created_at, updated_at)
- [x] Add `accounts` table (id text PK, user_id FK, account_id, provider_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, scope, id_token, password, created_at, updated_at)
- [x] Add `verifications` table (id text PK, identifier, value, expires_at, created_at, updated_at)
- [x] Add relations for new tables in `defineRelations`
- [x] Add inferred types for new tables
- [x] Generate Drizzle migration: `bunx drizzle-kit generate`
- [x] Run Drizzle migration: `bunx drizzle-kit migrate`

**File:** `src/lib/db/schema.ts`, `drizzle/` (new migration)
**Verify:** `bunx tsc --noEmit` passes, migration file looks correct

---

## Task 3: Update environment variable validation
- [x] Add `GOOGLE_CLIENT_ID` (z.string()) to `src/lib/env.ts` server config
- [x] Add `GOOGLE_CLIENT_SECRET` (z.string()) to `src/lib/env.ts` server config
- [x] Add `BETTER_AUTH_SECRET` (z.string().min(32)) to `src/lib/env.ts` server config
- [x] Add `BETTER_AUTH_URL` (z.url()) to `src/lib/env.ts` server config
- [x] Update `.env.example` with placeholder values for all four vars

**Files:** `src/lib/env.ts`, `.env.example`
**Verify:** `bunx tsc --noEmit` passes

**Note:** You will need to add these to your `.env.local` before the dev server
will start. `BETTER_AUTH_SECRET` can be generated with `openssl rand -base64 32`.
`BETTER_AUTH_URL` is `http://localhost:3000` for local dev. Google credentials
can be placeholder strings until you're ready for e2e testing.

---

## Task 4: Configure Better Auth server
- [x] Create `src/lib/auth.ts`
- [x] Import and configure `betterAuth` with:
  - [x] Drizzle adapter (`provider: "pg"`, `usePlural: true`, pass schema)
  - [x] Google social provider (env vars)
  - [x] `user.additionalFields` for `default_store_id`, `commute_minutes`, `trust_score`
  - [x] `databaseHooks.user.create.before` -- read invite code cookie, validate against DB, reject if invalid
  - [x] `databaseHooks.user.create.after` -- consume invite code (set `used_by`, `used_at`), clear cookie
  - [x] `tanstackStartCookies()` plugin from `better-auth/tanstack-start` (last in plugins array)

**File:** `src/lib/auth.ts`
**Depends on:** Task 2 (schema), Task 3 (env vars)
**Verify:** `bunx tsc --noEmit` passes

---

## Task 5: Create auth API route
- [x] Auth API route already exists at `src/app/api/auth/$.ts` (created during TanStack migration)
- [x] Verify it imports `auth` from `@/lib/auth` and handles GET/POST via `auth.handler(request)`
- [-] Update import path if auth config moves to `src/lib/auth/index.ts` — N/A, kept as `src/lib/auth.ts`

**File:** `src/app/api/auth/$.ts`
**Depends on:** Task 4
**Verify:** `bunx tsc --noEmit` passes

---

## Task 6: Create auth client utilities
- [x] Create `src/lib/auth-client.ts`
- [x] Import `createAuthClient` from `better-auth/react`
- [x] Export `authClient` instance
- [x] Export destructured helpers: `signIn`, `signOut`, `useSession`

**File:** `src/lib/auth-client.ts`
**Verify:** `bunx tsc --noEmit` passes

---

## Task 7: Build sign-up page
- [ ] Create `src/app/sign-up.tsx` as a TanStack route:
  ```tsx
  import { createFileRoute } from "@tanstack/react-router";

  export const Route = createFileRoute("/sign-up")({
    validateSearch: (search) => ({ code: search.code as string | undefined }),
    component: SignUpPage,
  });
  ```
  - [ ] Read `code` from route search params via `Route.useSearch()`
  - [ ] Use a server function to validate invite code (exists, not used, not revoked)
  - [ ] Render error message if code is missing or invalid
  - [ ] Render `<SignUpButton />` if code is valid
- [ ] Create `src/app/-components/sign-up-button.tsx` (Client Component)
  - [ ] Server function to set `invite_code` HTTP-only cookie (short TTL)
  - [ ] Call `authClient.signIn.social({ provider: "google", callbackURL: "/" })` after setting cookie
  - [ ] Minimal Tailwind styling

**Files:** `src/app/sign-up.tsx`, `src/app/-components/sign-up-button.tsx`
**Depends on:** Task 4, Task 6
**Verify:** `bunx tsc --noEmit` passes, `bun run lint` passes

---

## Task 8: Build sign-in page
- [ ] Create `src/app/sign-in.tsx` as a TanStack route:
  ```tsx
  import { createFileRoute } from "@tanstack/react-router";

  export const Route = createFileRoute("/sign-in")({
    component: SignInPage,
  });
  ```
  - [ ] Google sign-in button using `authClient.signIn.social({ provider: "google", callbackURL: "/" })`
  - [ ] Error state display
  - [ ] Minimal Tailwind styling

**Files:** `src/app/sign-in.tsx`
**Depends on:** Task 6
**Verify:** `bunx tsc --noEmit` passes, `bun run lint` passes

---

## Task 9: Create auth protection via route guard
- [ ] Create `src/app/_protected.tsx` as a pathless layout route:
  ```tsx
  import { createFileRoute, redirect } from "@tanstack/react-router";
  import { getSession } from "@/lib/auth.server";

  export const Route = createFileRoute("/_protected")({
    beforeLoad: async () => {
      const session = await getSession();
      if (!session) {
        throw redirect({ to: "/sign-in" });
      }
    },
  });
  ```
- [ ] Place protected pages under `src/app/_protected/` directory
- [ ] Public routes (`/`, `/sign-in`, `/sign-up`, `/api/auth/*`) remain outside the protected layout

**File:** `src/app/_protected.tsx`
**Depends on:** Task 4
**Verify:** `bunx tsc --noEmit` passes

---

## Task 10: Write tests
- [ ] Create `src/lib/__tests__/invite-code-validation.test.ts`
  - [ ] Extract invite code validation logic into a pure function
  - [ ] Test: valid code returns success
  - [ ] Test: missing code returns error
  - [ ] Test: already-used code returns error
  - [ ] Test: revoked code returns error
  - [ ] Test: nonexistent code returns error

**Verify:** `bunx vitest run` passes

---

## Task 11: Final verification
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run lint` passes (run `bunx ultracite fix` if needed)
- [ ] `bunx vitest run` passes
- [ ] All output files exist per plan.md
- [ ] Update plan.md status from `pending` to `done`

---

## Manual E2E Testing (when Google credentials are available)
- [ ] Visit `/sign-up?code=VALID_CODE` -- see sign-up button
- [ ] Visit `/sign-up?code=INVALID` -- see error
- [ ] Visit `/sign-up` (no code) -- see error
- [ ] Complete OAuth -- user created in DB, invite code marked used
- [ ] Visit `/sign-in` -- sign in with existing account
- [ ] Protected routes redirect to `/sign-in` when unauthenticated
- [ ] Sign out works
