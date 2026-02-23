# Migrate from Next.js to TanStack Start — Tasks

Each task below is independently executable. Tasks are ordered by dependency.
Status key: `[ ]` pending, `[~]` in progress, `[x]` done, `[-]` skipped/cancelled.

**Context:** The project is in early stages (only 001-database-setup is complete).
The `app/` directory still contains default Next.js scaffolding with no custom pages
or components. This makes the migration straightforward — we are replacing framework
plumbing, not rewriting application logic.

---

## Task 1: Remove Next.js-specific packages

- [x] Run `bun remove next @t3-oss/env-nextjs @vercel/analytics eslint eslint-config-next @tailwindcss/postcss`
- [x] Verify `package.json` no longer lists any of the above

**Verify:** `bun install` succeeds without errors

---

## Task 2: Install TanStack Start and replacement packages

- [x] Run `bun add @tanstack/react-router @tanstack/react-start @t3-oss/env-core`
- [x] Run `bun add -D vite @tailwindcss/vite`
- [x] Verify imports resolve: `@tanstack/react-router`, `@tanstack/react-start`, `@t3-oss/env-core`

**Note:** `@vitejs/plugin-react`, `vite-tsconfig-paths`, and `tailwindcss` are
already installed as devDeps. `better-auth`, `drizzle-orm`, `pg`, `zod` stay as-is.

**Verify:** `bun install` succeeds

---

## Task 3: Update package.json scripts and module type

- [x] Add `"type": "module"` to package.json (required for Vite ESM)
- [x] Update scripts:
  - `"dev": "vite dev"`
  - `"build": "vite build"`
  - `"start": "node .output/server/index.mjs"`
  - `"lint": "ultracite check"` (remove `&& eslint .`)
  - `"typecheck": "tsc --noEmit"` (unchanged)
  - `"test": "vitest"` (unchanged)
  - All `db:*` scripts unchanged

**File:** `package.json`
**Depends on:** Task 1, Task 2

---

## Task 4: Delete Next.js configuration files

- [x] Delete `next.config.ts`
- [x] Delete `postcss.config.mjs`
- [x] Delete `eslint.config.mjs`
- [x] Delete `next-env.d.ts`
- [x] Delete `public/next.svg`
- [x] Delete `public/vercel.svg`

**Verify:** None of the above files exist

---

## Task 5: Restructure into src/ directory

- [x] Create `src/` directory
- [x] Move `app/` to `src/app/`
- [x] Move `lib/` to `src/lib/`
- [x] Verify structure:
  ```
  src/
    app/
      favicon.ico
      globals.css
      layout.tsx    (will become __root.tsx in Task 9)
      page.tsx      (will become index.tsx in Task 10)
    lib/
      auth.ts
      db/
        index.ts
        schema.ts
      env.ts
  ```

**Verify:** All files moved, no orphaned `app/` or `lib/` at project root

---

## Task 6: Create vite.config.ts

- [x] Create `vite.config.ts` at project root:
  ```ts
  import { defineConfig } from "vite";
  import { tanstackStart } from "@tanstack/react-start/plugin/vite";
  import viteReact from "@vitejs/plugin-react";
  import tsconfigPaths from "vite-tsconfig-paths";
  import tailwindcss from "@tailwindcss/vite";

  export default defineConfig({
    server: { port: 3000 },
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart({
        srcDirectory: "src",
        router: {
          routesDirectory: "app",
        },
      }),
      viteReact(),
    ],
  });
  ```

**File:** `vite.config.ts`
**Depends on:** Task 2, Task 4, Task 5

---

## Task 7: Update tsconfig.json

- [x] Remove the `"plugins": [{ "name": "next" }]` entry
- [x] Update `"paths"` to `"@/*": ["./src/*"]`
- [x] Remove `"next-env.d.ts"` from `"include"`
- [x] Remove `".next/types/**/*.ts"` and `".next/dev/types/**/*.ts"` from `"include"`
- [x] Keep `"strict": true`, `"noEmit": true`, `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`

**File:** `tsconfig.json`
**Depends on:** Task 5

---

## Task 8: Update .gitignore

- [x] Remove `.next` references
- [x] Add `.output/` (TanStack Start build output)
- [x] Add `.vinxi/` (TanStack Start dev cache)

**File:** `.gitignore`

---

## Task 9: Convert layout.tsx to __root.tsx

- [x] Rename `src/app/layout.tsx` to `src/app/__root.tsx`
- [x] Remove `next/font/google` imports (Geist fonts)
- [x] Remove `next` Metadata type/export
- [x] Import `Outlet`, `createRootRoute`, `HeadContent`, `Scripts` from `@tanstack/react-router`
- [x] Import CSS as URL: `import appCss from "./globals.css?url"`
- [x] Export `Route = createRootRoute({ ... })` with:
  - [x] `head()` returning meta (charset, viewport, title) and link to stylesheet
  - [x] `component: RootLayout`
- [x] Implement `RootLayout` function:
  ```tsx
  function RootLayout() {
    return (
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body className="antialiased">
          <Outlet />
          <Scripts />
        </body>
      </html>
    );
  }
  ```

**Note:** Geist fonts were loaded via `next/font/google` which is Next.js-specific.
For now, remove them and use the system font stack. Fonts can be re-added later via
Fontsource (`@fontsource-variable/geist`, `@fontsource-variable/geist-mono`) and
CSS `@import` in globals.css.

**File:** `src/app/__root.tsx`
**Depends on:** Task 5, Task 6

---

## Task 10: Convert page.tsx to index.tsx

- [x] Rename `src/app/page.tsx` to `src/app/index.tsx`
- [x] Remove `import Image from "next/image"` — replace with standard `<img>` tags
- [x] Remove `export default` — use named function
- [x] Add TanStack route export:
  ```ts
  import { createFileRoute } from "@tanstack/react-router";

  export const Route = createFileRoute("/")({
    component: Home,
  });
  ```
- [ ] Replace Next.js-specific content/links with project-appropriate placeholder

**File:** `src/app/index.tsx`
**Depends on:** Task 5, Task 6

---

## Task 11: Update globals.css

- [x] Update Tailwind import for Vite plugin source resolution:
  `@import "tailwindcss" source("../");`
- [x] Remove `--font-geist-sans` and `--font-geist-mono` CSS variable references
  from `@theme inline` block (fonts handled differently now)
- [x] Keep `--color-background`, `--color-foreground` tokens and dark mode media query

**File:** `src/app/globals.css`
**Depends on:** Task 5

---

## Task 12: Create router.tsx

- [x] Create `src/router.tsx`:
  ```ts
  import { createRouter } from "@tanstack/react-router";
  import { routeTree } from "./routeTree.gen";

  export function getRouter() {
    const router = createRouter({
      routeTree,
      scrollRestoration: true,
    });
    return router;
  }
  ```

**Note:** `routeTree.gen.ts` is auto-generated by TanStack Router on first `vite dev`.
TypeScript errors referencing this file are expected until the dev server runs.

**File:** `src/router.tsx`
**Depends on:** Task 6

---

## Task 13: Switch t3-env from Next.js to core

- [x] Change import from `@t3-oss/env-nextjs` to `@t3-oss/env-core`
- [x] Add `clientPrefix: "PUBLIC_"` to config (required by core package)
- [x] Change `runtimeEnv` from individual property mapping to `process.env`
- [ ] Result:
  ```ts
  import { createEnv } from "@t3-oss/env-core";
  import { z } from "zod";

  export const env = createEnv({
    server: {
      DATABASE_URL: z.url(),
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.url(),
    },
    clientPrefix: "PUBLIC_",
    client: {},
    runtimeEnv: process.env,
  });
  ```

**File:** `src/lib/env.ts`
**Depends on:** Task 2 (core package installed), Task 5

---

## Task 14: Update Better Auth for TanStack Start

- [x] Add `tanstackStartCookies` plugin to auth config:
  ```ts
  import { tanstackStartCookies } from "better-auth/tanstack-start";

  export const auth = betterAuth({
    // ... existing config
    plugins: [tanstackStartCookies()], // must be last plugin
  });
  ```
- [x] Remove any `nextCookies()` import/usage if present

**File:** `src/lib/auth.ts`
**Depends on:** Task 5

---

## Task 15: Create auth API route (TanStack Start style)

- [x] Create `src/app/api/auth/$.ts` (catch-all server route):
  ```ts
  import { auth } from "@/lib/auth";
  import { createFileRoute } from "@tanstack/react-router";

  export const Route = createFileRoute("/api/auth/$")({
    server: {
      handlers: {
        GET: async ({ request }: { request: Request }) => {
          return await auth.handler(request);
        },
        POST: async ({ request }: { request: Request }) => {
          return await auth.handler(request);
        },
      },
    },
  });
  ```

**File:** `src/app/api/auth/$.ts`
**Depends on:** Task 14

---

## Task 16: Create server-side auth helpers

- [x] Create `src/lib/auth.server.ts`:
  ```ts
  import { createServerFn } from "@tanstack/react-start";
  import { getRequestHeaders } from "@tanstack/react-start/server";
  import { auth } from "@/lib/auth";

  export const getSession = createServerFn({ method: "GET" }).handler(
    async () => {
      const headers = getRequestHeaders();
      const session = await auth.api.getSession({ headers });
      return session;
    },
  );

  export const ensureSession = createServerFn({ method: "GET" }).handler(
    async () => {
      const headers = getRequestHeaders();
      const session = await auth.api.getSession({ headers });
      if (!session) {
        throw new Error("Unauthorized");
      }
      return session;
    },
  );
  ```

**Note:** These helpers replace the Next.js `proxy.ts` / `middleware.ts` approach
documented in decision #5. Route protection is handled via `beforeLoad` in route
definitions instead.

**File:** `src/lib/auth.server.ts`
**Depends on:** Task 14

---

## Task 17: Update drizzle.config.ts

- [x] Update `schema` path from `"./lib/db/schema.ts"` to `"./src/lib/db/schema.ts"`

**File:** `drizzle.config.ts`
**Depends on:** Task 5

---

## Task 18: Update vitest.config.mts

- [x] Verify config still works with new `src/` structure
- [x] `vite-tsconfig-paths` should resolve `@/*` to `src/*` via updated tsconfig
- [x] No changes expected unless path resolution breaks

**File:** `vitest.config.mts`
**Depends on:** Task 7

---

## Task 19: Update CI workflow

- [x] Remove ESLint step (Biome/Ultracite handles linting)
- [x] Verify lint command runs `bun run lint` (now `ultracite check` only)
- [x] No other changes needed — typecheck and test commands are unchanged

**File:** `.github/workflows/ci.yml`
**Depends on:** Task 3

---

## Task 20: First run verification

- [x] Run `bun run dev` — should start Vite dev server on port 3000
- [x] TanStack Router auto-generates `src/routeTree.gen.ts`
- [x] Visit `http://localhost:3000` — home page renders
- [x] No console errors in terminal or browser

**Depends on:** Tasks 1–18
**Verify:** Dev server starts, page loads, no errors

---

## Task 21: Update auth setup plan for TanStack Start

- [x] Update `docs/feature/phase-01/002-auth-setup/task.md`:
  - [x] Task 4: Replace `nextCookies()` with `tanstackStartCookies()`
  - [x] Task 5: Replace `app/api/auth/[...all]/route.ts` with `src/app/api/auth/$.ts` pattern
  - [x] Task 7/8: Replace Server Components / Client Components pattern with TanStack route + `createFileRoute` pattern
  - [x] Task 9: Replace `proxy.ts` with `beforeLoad` + `getSession` pattern
  - [x] Update all file paths from `app/` and `lib/` to `src/app/` and `src/lib/`
- [x] Update `docs/feature/phase-01/002-auth-setup/plan.md` output file paths

**Files:** `docs/feature/phase-01/002-auth-setup/task.md`, `docs/feature/phase-01/002-auth-setup/plan.md`
**Depends on:** Task 20

---

## Task 22: Update project documentation

- [x] Update `AGENTS.md` (and `CLAUDE.md`):
  - [x] Commands section: `vite dev` / `vite build` / `node .output/server/index.mjs`
  - [x] Project structure: `src/app/`, `src/lib/`, `src/router.tsx`
  - [x] Remove ESLint config section (Biome-only now)
  - [x] Remove `eslint.config.mjs` reference
  - [x] Update routing conventions: `__root.tsx`, `index.tsx`, `$param.tsx`, `$.tsx`
  - [x] Replace "Server Components by default" with TanStack route loaders / server functions
  - [x] Replace `postcss.config.mjs` references with `vite.config.ts`
  - [x] Update Tailwind section: via Vite plugin, not PostCSS
- [x] Update `docs/PRD.md`:
  - [x] Tech stack: "TanStack Start (Vite-based)" instead of "Next.js (App Router)"
  - [x] Remove Vercel-specific references
- [x] Add entry to `docs/decisions.md`:
  - [x] Decision: Migrate from Next.js App Router to TanStack Start
  - [x] Rationale: Vite-based, file-based routing, better auth integration, framework flexibility
  - [x] Impact on prior decisions (proxy.ts -> beforeLoad, nextCookies -> tanstackStartCookies)

**Files:** `AGENTS.md`, `CLAUDE.md`, `docs/PRD.md`, `docs/decisions.md`
**Depends on:** Task 20

---

## Task 23: Final verification

- [x] `bun run dev` starts without errors
- [x] `bunx tsc --noEmit` passes
- [x] `bun run lint` passes (run `bunx ultracite fix` if needed)
- [x] `bunx vitest run` passes (if tests exist)
- [x] No remaining imports from `next`, `next/*`, `@t3-oss/env-nextjs`, or `eslint-config-next`
- [x] `.gitignore` includes `.output/` and `.vinxi/`
- [x] All `@/*` path aliases resolve to `src/*`

---

## Compatibility Reference

| Component | Compatible? | Migration Effort |
|---|---|---|
| Drizzle ORM + migrations | Fully compatible | Path update only |
| Better Auth | Fully compatible | Swap cookie plugin, mount as TanStack route |
| t3-env | Fully compatible | Swap `env-nextjs` -> `env-core`, add `clientPrefix` |
| Tailwind CSS v4 | Fully compatible | Swap PostCSS plugin -> Vite plugin |
| Vitest + Testing Library | Fully compatible | Already Vite-based |
| Biome / Ultracite | Fully compatible | No changes |
| Zod | Fully compatible | No changes |

---

## Routing Convention Reference

| Route | Next.js App Router | TanStack Start |
|---|---|---|
| Root Layout | `app/layout.tsx` | `src/app/__root.tsx` |
| Home (`/`) | `app/page.tsx` | `src/app/index.tsx` |
| Static (`/posts`) | `app/posts/page.tsx` | `src/app/posts.tsx` |
| Dynamic (`/posts/:slug`) | `app/posts/[slug]/page.tsx` | `src/app/posts/$slug.tsx` |
| Catch-All (`/api/auth/*`) | `app/api/auth/[...all]/route.ts` | `src/app/api/auth/$.ts` |
| Layout (nested) | `app/dashboard/layout.tsx` | `src/app/_dashboard.tsx` |
| Protected group | N/A (middleware) | `src/app/_protected.tsx` (pathless layout with `beforeLoad`) |

---

## Risk Notes

1. **TanStack Start is v0 (RC)** — not yet v1 stable. API may change.
2. **No `next/image` equivalent** — use `<img>` or add Unpic later.
3. **No React Server Components** — data fetching uses route `loader` functions instead.
4. **Deployment** — supports Vercel, Netlify, Cloudflare, bare Node.js. May need a preset in vite.config.ts depending on target.
