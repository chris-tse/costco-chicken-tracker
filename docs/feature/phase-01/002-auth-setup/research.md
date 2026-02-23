# 002 Auth Setup — Research

## Better Auth Core Architecture

### Package Structure
- Single package: `better-auth` (no additional peer deps for Drizzle adapter or Google OAuth)
- Client import: `better-auth/react` (provides `createAuthClient` with React hooks)
- Drizzle adapter import: `better-auth/adapters/drizzle`
- Next.js helpers: `better-auth/next-js` (provides `toNextJsHandler`, `nextCookies`)
- Cookie utilities: `better-auth/cookies` (provides `getSessionCookie`)

### Core Tables Required
Better Auth expects four core tables (default singular names):

| Table | Key Columns |
|---|---|
| `user` | id (text PK), name, email, emailVerified (bool), image, createdAt, updatedAt |
| `session` | id (text PK), userId (FK), token (unique), expiresAt, ipAddress, userAgent, createdAt, updatedAt |
| `account` | id (text PK), userId (FK), accountId, providerId, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, idToken, password, createdAt, updatedAt |
| `verification` | id (text PK), identifier, value, expiresAt, createdAt, updatedAt |

### Drizzle Adapter Behavior
- Does NOT auto-create tables. Schema must be defined manually in the Drizzle schema file or generated via `bunx @better-auth/cli generate`.
- Supports `usePlural: true` to map `user` -> `users`, `session` -> `sessions`, etc.
- Supports custom field mapping via either Drizzle column name overrides or Better Auth's `fields` config.
- Supports passing the full schema object for table/relation resolution.

## User Table Strategy

### Decision: Extend existing `users` table

The existing `users` table (from 001-database-setup) has:
- `id` (text PK) -- matches Better Auth's expected type
- `email` (text, unique, not null) -- matches
- `name` (text) -- matches
- `image` (text) -- matches
- `created_at` (timestamptz) -- matches (with column name mapping)
- App-specific: `default_store_id`, `commute_minutes`, `trust_score`

Missing columns needed by Better Auth:
- `email_verified` (boolean, default false)
- `updated_at` (timestamptz)

**Approach:**
1. Add `email_verified` and `updated_at` to the `users` table in Drizzle schema
2. Use `usePlural: true` in drizzle adapter config
3. Register app-specific columns via `user.additionalFields` in Better Auth config
4. Better Auth will treat the extended `users` table as its own user table

**Why not separate tables:** No data sync, single source of truth, simpler queries. Better Auth explicitly supports this pattern.

## Session Strategy

### Decision: Database sessions (Better Auth default)

Better Auth uses cookie-based database sessions by default:
- Session stored in `sessions` table
- Session token stored in HTTP-only cookie
- Default expiry: 7 days, refreshed when `updateAge` (1 day) is reached
- Cookie caching available as opt-in optimization (not needed at this stage)

No JWT configuration needed. Database sessions provide:
- Easy session revocation
- Server-side session data
- No token size concerns
- Simpler mental model

## Next.js 16 Integration

### Proxy vs Middleware
Next.js 16.1.6 renames `middleware.ts` to `proxy.ts`:
- Export name: `proxy` (not `middleware`)
- Supports Node.js runtime (can call `auth.api.getSession`)
- Better Auth docs confirm compatibility

### Recommended Auth Protection Pattern
1. **Proxy (`proxy.ts`):** Optimistic cookie-existence check using `getSessionCookie()` for redirects. Fast, no DB call.
2. **Page-level:** Full session validation in Server Components using `auth.api.getSession({ headers: await headers() })`.

This two-layer approach is recommended by both Next.js and Better Auth docs.

### API Route
Standard catch-all at `app/api/auth/[...all]/route.ts` using `toNextJsHandler(auth)`.

### Server Actions
Use `nextCookies()` plugin (last in plugins array) to handle cookie setting in server actions.

## Invite Code Through OAuth

### Problem
Google OAuth involves a redirect away from the app. The invite code from `/sign-up?code=abc123` is lost during this redirect. Better Auth handles user creation in its internal callback handler, so the invite code must be available at that point.

### Decision: HTTP-only cookie + database hooks

**Flow:**
1. User visits `/sign-up?code=abc123`
2. Server Component validates code against DB (exists, not used, not revoked)
3. If valid, render sign-up button. If invalid, render error.
4. Before initiating OAuth, a server action sets an HTTP-only cookie: `invite_code=abc123` (short TTL, e.g. 10 minutes)
5. User redirected to Google, then back to `/api/auth/callback/google`
6. Better Auth's `databaseHooks.user.create.before`:
   - Read `invite_code` cookie from request context
   - Re-validate code against DB (defense in depth)
   - If invalid: return `false` to abort user creation
7. Better Auth's `databaseHooks.user.create.after`:
   - Mark invite code as used (`used_by = user.id`, `used_at = now()`)
   - Clear the `invite_code` cookie

**Alternatives rejected:**
- *Post-signup gate:* Creates unauthorized users, requires cleanup
- *OAuth state param:* Better Auth doesn't expose control over it
- *Deferred integration:* Changes PRD flow, harder to add later

## Google OAuth Setup

### Credentials Required
- `GOOGLE_CLIENT_ID` -- from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` -- from Google Cloud Console
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google` (dev)

### Better Auth Config
```ts
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
}
```

### Environment Variables (total for auth)
- `GOOGLE_CLIENT_ID` -- Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` -- Google OAuth client secret
- `BETTER_AUTH_SECRET` -- Session signing secret (min 32 chars, high entropy)
- `BETTER_AUTH_URL` -- Base URL for auth callbacks (e.g. `http://localhost:3000`)

## Client-Side Auth

### `createAuthClient` from `better-auth/react`
- Provides reactive hooks: `useSession()`
- Provides action methods: `signIn.social()`, `signOut()`
- Uses `nanostores` internally for state management
- No separate provider/context wrapper needed in layout
- For same-domain deployment, no `baseURL` config needed

## Open Items
- Drizzle migration for new columns/tables must be generated and applied
- Google Cloud project + OAuth credentials needed before e2e testing
- Sign-up/sign-in page styling is temporary (will be replaced in 003-shadcn-ui-init)
