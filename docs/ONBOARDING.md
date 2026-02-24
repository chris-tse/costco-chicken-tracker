# Onboarding Guide

Welcome to the team. This guide covers everything you need to get productive in this codebase, with a focus on bridging your Next.js knowledge to TanStack Start.

---

## 1. What This Project Is

CostcoChickenTracker is a crowdsourced web app for tracking Costco rotisserie chicken batch timestamps and visualizing probability heatmaps. It's **early stage** -- database, auth, and routing are set up, but the core features (sighting submission, heatmaps, admin panel) aren't built yet.

Read `docs/PRD.md` for full product requirements and `docs/decisions.md` for the architectural decision log.

---

## 2. Getting Started

```bash
# 1. Install dependencies
bun install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, BETTER_AUTH_SECRET (32+ chars),
#          GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# 3. Run database migrations
bun run db:migrate

# 4. Start dev server
bun run dev          # http://localhost:3000

# 5. Other useful commands
bun run build        # Production build
bun run check        # Lint check (Biome via Ultracite)
bun run fix          # Auto-fix lint issues
bun run typecheck    # Type-check without emitting
bun run test         # Run all tests (Vitest)
bun run db:studio    # Launch Drizzle Studio (DB browser)
```

---

## 3. Tech Stack at a Glance

| Layer | Tool | Next.js Equivalent |
|---|---|---|
| Framework | **TanStack Start** | Next.js App Router |
| Routing | **TanStack Router** (file-based) | `app/` directory routing |
| Server functions | `createServerFn` | Server Actions / `"use server"` |
| Auth | **Better Auth** | NextAuth.js |
| Database | **Drizzle ORM** + PostgreSQL | Prisma / Drizzle |
| Styling | **Tailwind CSS v4** (Vite plugin) | Tailwind CSS |
| Build tool | **Vite** | Webpack / Turbopack |
| Runtime | **Bun** | Node.js |
| Linter/Formatter | **Biome** (via Ultracite) | ESLint + Prettier |
| Testing | **Vitest** + React Testing Library | Jest + RTL |

---

## 4. TanStack Start vs Next.js -- Key Differences

### 4.1 Routing

**Next.js:** Routes live in `app/`, folders = URL segments, `page.tsx` = the page, `layout.tsx` = the layout.

**TanStack Start:** Routes live in `src/app/` (configured in `vite.config.ts`). Each `.tsx` file is a route. The filename *is* the URL path.

| Concept | Next.js | TanStack Start (this project) |
|---|---|---|
| Route definition | `app/dashboard/page.tsx` | `src/app/_protected/_admin/dashboard.tsx` |
| Root layout | `app/layout.tsx` | `src/app/__root.tsx` |
| Nested layouts | `app/dashboard/layout.tsx` | Pathless route files like `_protected.tsx` |
| Dynamic params | `[id]/page.tsx` | `$id.tsx` |
| Catch-all routes | `[...slug]/page.tsx` | `$.tsx` |
| Private folders | `_components/` (convention) | `-components/` (Router ignores `-` prefix) |
| 404 page | `not-found.tsx` | `NotFound` component in router config (`src/router.tsx`) |

**Docs:**
- [TanStack Router File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [TanStack Start Overview](https://tanstack.com/start/latest/docs/framework/react/overview)

### 4.2 Route Definition Pattern

In Next.js, you just export a default component. In TanStack Start, you call `createFileRoute` with a route path and pass configuration:

```tsx
// src/app/sign-in.tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in")({
  component: SignIn,        // equivalent to the default export in Next.js
  loader: async () => {},   // runs on server before render (like generateMetadata + data fetching)
  beforeLoad: async () => {},  // runs before loader, good for auth guards
  head: () => ({}),         // equivalent to generateMetadata
});

function SignIn() {
  return <div>Sign In Page</div>;
}
```

The `export const Route` is required -- TanStack Router uses it to wire up the route tree.

**Docs:** [TanStack Router Route Configuration](https://tanstack.com/router/latest/docs/framework/react/guide/route-trees)

### 4.3 Layouts (Pathless Routes)

In Next.js, `layout.tsx` wraps all sibling and child routes automatically. TanStack Start uses **pathless route files** (prefixed with `_`) that don't add a URL segment but do wrap children.

Example from this codebase:

```
src/app/
  _protected.tsx          # Layout: checks auth in beforeLoad, renders <Outlet />
  _protected/
    _admin.tsx            # Layout: checks admin role, renders <Outlet />
    _admin/
      dashboard.tsx       # Actual page at /dashboard
```

- `_protected.tsx` runs `getSession()` in `beforeLoad` and redirects to `/sign-in` if no session. See `src/app/_protected.tsx`.
- `_admin.tsx` checks `session.user.role === "admin"`. See `src/app/_protected/_admin.tsx`.
- `<Outlet />` is the equivalent of `{children}` in a Next.js layout.

**Docs:** [TanStack Router Pathless Routes](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#pathless-layout-routes)

### 4.4 Server Functions (`createServerFn`)

In Next.js, you use `"use server"` directives for Server Actions. TanStack Start uses `createServerFn`:

```tsx
// src/lib/auth.server.ts
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    return session;
  },
);
```

Key differences from Next.js Server Actions:
- Explicitly defined with `method: "GET"` or `"POST"`
- Input validation via `.validator()` chain (uses Zod or similar)
- Called like regular async functions from loaders or components
- Headers/cookies accessed via `getRequestHeaders()` / framework helpers, not `next/headers`

**Docs:** [TanStack Start Server Functions](https://tanstack.com/start/latest/docs/framework/react/server-functions)

### 4.5 Data Loading

Next.js App Router fetches data in async Server Components. TanStack Start uses **route loaders**:

```tsx
export const Route = createFileRoute("/sign-up")({
  // Declare which search params the loader depends on
  loaderDeps: ({ search }) => ({ code: search.code }),

  // Runs on the server before the component renders
  loader: async ({ deps }) => {
    const result = await validateInviteCode({ data: deps.code });
    return result;
  },

  component: SignUp,
});

function SignUp() {
  const data = Route.useLoaderData();  // typed, no useEffect needed
  // ...
}
```

- `loaderDeps` extracts reactive dependencies (search params, etc.)
- `loader` runs server-side, similar to `getServerSideProps` but integrated into the router
- `Route.useLoaderData()` gives you typed access in the component

**Docs:** [TanStack Router Data Loading](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading)

### 4.6 Head / Meta Tags

Next.js uses `generateMetadata`. TanStack Start uses a `head` function on the route:

```tsx
// src/app/__root.tsx
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  component: RootLayout,
});
```

Then in the root layout, `<HeadContent />` renders the meta tags and `<Scripts />` injects the client scripts -- analogous to Next.js's automatic head management.

---

## 5. Project Structure

```
src/
├── app/                        # File-based routes
│   ├── __root.tsx              # Root layout (HTML shell)
│   ├── _protected.tsx          # Auth guard layout
│   ├── _protected/
│   │   ├── _admin.tsx          # Admin role guard
│   │   └── _admin/
│   │       └── dashboard.tsx   # /dashboard
│   ├── -components/            # Route-colocated components (- = ignored by router)
│   ├── api/auth/$.ts           # Better Auth API catch-all
│   ├── globals.css             # Tailwind + design tokens
│   ├── index.tsx               # / (home)
│   ├── sign-in.tsx             # /sign-in
│   └── sign-up.tsx             # /sign-up
├── lib/
│   ├── auth.ts                 # Better Auth server config
│   ├── auth-client.ts          # Better Auth client (browser)
│   ├── auth.server.ts          # Server functions (getSession, ensureSession)
│   ├── db/
│   │   ├── index.ts            # Drizzle client
│   │   └── schema.ts           # Full DB schema + relations + types
│   ├── env.ts                  # Type-safe env validation (t3-env + Zod)
│   └── utils/                  # Utility functions + tests
├── router.tsx                  # Router factory + NotFound component
└── routeTree.gen.ts            # Auto-generated route tree (DO NOT EDIT)
```

**Key rule:** `src/routeTree.gen.ts` is auto-generated. Never edit it manually. It regenerates when you add/remove route files while the dev server is running.

---

## 6. Authentication (Better Auth)

This project uses [Better Auth](https://www.better-auth.com/docs/introduction), a TypeScript-first auth framework. Coming from NextAuth, here's how it maps:

| Concept | NextAuth | Better Auth (this project) |
|---|---|---|
| Config file | `auth.ts` with `NextAuth()` | `src/lib/auth.ts` with `betterAuth()` |
| Client hooks | `useSession()` from `next-auth/react` | `useSession()` from `src/lib/auth-client.ts` |
| API route | `app/api/auth/[...nextauth]/route.ts` | `src/app/api/auth/$.ts` |
| Session strategy | JWT (default) or database | Database sessions (decision in `docs/decisions.md`) |
| Providers | `providers: [Google({...})]` | `socialProviders: { google: {...} }` |
| Role-based access | Custom middleware | `admin()` plugin with `role` column |

### Auth Files

- **`src/lib/auth.ts`** -- Server-side config. Google OAuth, Drizzle adapter, admin plugin, invite code hooks.
- **`src/lib/auth-client.ts`** -- Browser client. Exports `signIn`, `signOut`, `useSession`.
- **`src/lib/auth.server.ts`** -- Server functions for session retrieval in route loaders/beforeLoad.
- **`src/app/api/auth/$.ts`** -- Catch-all API route forwarding to Better Auth's handler.

### Auth Flow

1. User visits `/sign-up?code=abc123` -- invite code is validated server-side in the route loader
2. Clicking "Sign Up" sets an HTTP-only cookie with the invite code, then redirects to Google OAuth
3. On account creation, a `databaseHooks.user.create.before` hook validates and consumes the invite code
4. Protected routes use `beforeLoad` in `_protected.tsx` to call `getSession()` and redirect if unauthenticated

**Docs:**
- [Better Auth Introduction](https://www.better-auth.com/docs/introduction)
- [Better Auth Social Sign-In](https://www.better-auth.com/docs/authentication/social-sign-in)
- [Better Auth Admin Plugin](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth Drizzle Adapter](https://www.better-auth.com/docs/storage/drizzle)

---

## 7. Database (Drizzle ORM)

The project uses [Drizzle ORM](https://orm.drizzle.team/docs/overview) with PostgreSQL (PlanetScale Postgres).

### Key Files

- **`src/lib/db/schema.ts`** -- All 7 tables: `stores`, `users`, `invite_codes`, `sessions`, `accounts`, `verifications`, `chicken_sightings`. Also defines relations and exports inferred types.
- **`src/lib/db/index.ts`** -- Drizzle client instance.
- **`drizzle.config.ts`** -- Migration configuration.
- **`drizzle/`** -- Migration files (2 so far).

### Commands

```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Run pending migrations
bun run db:push       # Push schema directly (skip migration files)
bun run db:studio     # Drizzle Studio (browser-based DB explorer)
```

**Docs:**
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle PostgreSQL Column Types](https://orm.drizzle.team/docs/column-types/pg)
- [Drizzle Relations](https://orm.drizzle.team/docs/relations)

---

## 8. Styling (Tailwind CSS v4)

Tailwind v4 is a significant change from v3. Key differences:

- **No `tailwind.config.js`** -- Configuration is done in CSS via `@theme` directives in `src/app/globals.css`
- **Vite plugin** instead of PostCSS: configured in `vite.config.ts` as `tailwindcss()`
- Design tokens are CSS custom properties exposed to Tailwind via `@theme inline { ... }`
- Dark mode uses `prefers-color-scheme` media query and `dark:` variants

**Docs:** [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)

---

## 9. Other Tools

### Biome (Linting/Formatting)

Biome replaces ESLint + Prettier. It's configured via `biome.jsonc` (extends `ultracite/biome/core`). Your editor should auto-format on save if you're using VS Code (settings are in `.vscode/settings.json`).

```bash
bun run check   # Check for issues
bun run fix     # Auto-fix
```

**Docs:** [Biome](https://biomejs.dev/guides/getting-started/)

### t3-env (Environment Variables)

Type-safe env vars are validated at startup in `src/lib/env.ts` using Zod schemas. If a required variable is missing, the app crashes with a clear error message instead of silently using `undefined`.

**Docs:** [t3-env](https://env.t3.gg/docs/introduction)

### Vitest (Testing)

```bash
bun run test                            # Run all tests
bunx vitest run path/to/file.test.ts    # Single file
bunx vitest run -t "pattern"            # By name pattern
bunx vitest watch                       # Watch mode
```

Config is in `vitest.config.mts`. Uses `jsdom` environment with React Testing Library.

**Docs:** [Vitest](https://vitest.dev/guide/)

---

## 10. Development Workflow

1. **Create a route:** Add a `.tsx` file in `src/app/`. The dev server auto-regenerates `routeTree.gen.ts`.
2. **Add server logic:** Use `createServerFn` in a `.server.ts` file or co-located in the route file.
3. **Protect a route:** Nest it under `_protected/` (or add your own pathless layout route).
4. **Modify the DB schema:** Edit `src/lib/db/schema.ts`, then run `bun run db:generate && bun run db:migrate`.
5. **Before committing:** Run `bun run fix && bun run typecheck && bun run test`.

---

## 11. Current Project Status

**Completed:**
- Phase 01: Database setup, auth setup (Google OAuth, invite codes, protected/admin routes)

**Not yet started:**
- Phase 01: Shadcn UI init
- Phase 02-06: Store data pipeline, sighting submission, heatmap, admin panel, user profiles, trust scores, and more

Check `docs/feature/` for detailed plans per feature. Each subdirectory has a `plan.md` with implementation details.

---

## 12. Quick Reference Links

| Topic | URL |
|---|---|
| TanStack Start Docs | https://tanstack.com/start/latest/docs/framework/react/overview |
| TanStack Router Guide | https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing |
| TanStack Server Functions | https://tanstack.com/start/latest/docs/framework/react/server-functions |
| Better Auth Docs | https://www.better-auth.com/docs/introduction |
| Drizzle ORM Docs | https://orm.drizzle.team/docs/overview |
| Tailwind CSS v4 | https://tailwindcss.com/docs |
| Vitest | https://vitest.dev/guide/ |
| Biome | https://biomejs.dev/guides/getting-started/ |
| t3-env | https://env.t3.gg/docs/introduction |
