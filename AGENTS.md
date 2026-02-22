# AGENTS.md

## Project Overview

CostcoChickenTracker — a Next.js (App Router) web app for crowdsourcing Costco
rotisserie chicken batch timestamps and visualizing probability heatmaps. Full-stack
TypeScript, single repo. Early stage (scaffolded from `create-next-app`, core features
not yet built).

---

## Commands

Package manager: **Bun** (lockfile: `bun.lock`).

```bash
bun install                               # Install dependencies
bun run dev                               # Development server (http://localhost:3000)
bun run build                             # Production build
bun run start                             # Start production server
bun run lint                              # Lint (ESLint 9 flat config)
bunx eslint app/page.tsx                  # Lint a single file
bunx tsc --noEmit                         # Type-check without emitting
bunx vitest run                           # Run all tests
bunx vitest run path/to/file.test.ts      # Run a single test file
bunx vitest run -t "pattern"              # Run tests matching a pattern
bunx vitest watch                         # Watch mode
```

Testing uses **Vitest** + **React Testing Library** (`@testing-library/react`,
`@testing-library/jest-dom`) with `jsdom` as the environment.

---

## Project Structure

```
app/                  # Next.js App Router pages and layouts
  layout.tsx          # Root layout (Geist fonts, global CSS)
  page.tsx            # Home page
  globals.css         # Tailwind v4 + CSS custom properties
docs/
  PRD.md              # Product requirements document (canonical)
  TECH_SPEC.md        # Technical specification (older, PRD wins on conflicts)
public/               # Static assets (SVGs)
eslint.config.mjs     # ESLint 9 flat config
next.config.ts        # Next.js configuration
postcss.config.mjs    # PostCSS with @tailwindcss/postcss
vitest.config.mts     # Vitest test configuration
tsconfig.json         # TypeScript config (strict, bundler resolution)
```

---

## Code Style Guidelines

### TypeScript

- **Strict mode** is on (`"strict": true` in tsconfig.json).
- Target: ES2017. Module: ESNext with bundler resolution.
- Use `type` imports for type-only imports: `import type { Foo } from "bar"`.
- Path alias: `@/*` maps to project root. Use `@/app/...`, `@/lib/...`, etc.
- Prefer explicit return types on exported functions.
- No `any` — use `unknown` and narrow with type guards.

### Imports

- Order: (1) React/Next.js, (2) third-party, (3) internal `@/` aliases, (4) relative.
- Separate groups with a blank line.
- Use named exports for components and utilities. Default exports only for
  Next.js pages/layouts (required by the framework).

```tsx
import type { Metadata } from "next";

import { someUtil } from "@/lib/utils";

import "./globals.css";
```

### React / Next.js

- **App Router** pattern. Pages go in `app/` as `page.tsx`.
- Server Components by default. Add `"use client"` only for client interactivity.
- Layouts in `layout.tsx`, loading in `loading.tsx`, errors in `error.tsx`.
- Use Next.js `<Image>` instead of `<img>`.
- Props types: inline `Readonly<{}>` wrapper or named interfaces.

### Styling

- **Tailwind CSS v4** via PostCSS (not the older config-based setup).
- Utility-first classes directly in JSX `className`.
- CSS custom properties defined in `app/globals.css`.
- Dark mode via `prefers-color-scheme` media query and `dark:` variants.
- Use the project's design tokens (`--background`, `--foreground`, `--font-sans`,
  `--font-mono`) rather than hardcoding colors.

### Naming Conventions

- **Files**: `kebab-case` for utility files, `PascalCase.tsx` for components (or
  follow Next.js conventions like `page.tsx`, `layout.tsx`).
- **Components**: PascalCase (`RootLayout`, `Home`).
- **Functions/variables**: camelCase.
- **Types/interfaces**: PascalCase, prefer `type` over `interface` unless extending.
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for config objects.
- **Database columns**: snake_case (matching Drizzle schema conventions).

### Error Handling

- Use Next.js `error.tsx` boundaries for page-level errors.
- Server actions should return structured error objects, not throw.
- For Effect-based code: use typed errors in the error channel, not exceptions.
- Validate all user input on the server side (timestamps, GPS, rate limits).

### Formatting

- 2-space indentation.
- Double quotes for strings in JSX attributes and imports.
- Semicolons at end of statements.
- Trailing commas in multi-line structures.
- Max line length: ~100 characters (soft limit, break JSX as needed).

---

## ESLint Configuration

Flat config (`eslint.config.mjs`) extends `eslint-config-next/core-web-vitals` and
`eslint-config-next/typescript`. Ignored paths: `.next/`, `out/`, `build/`,
`next-env.d.ts`. Do not disable ESLint rules without a comment explaining why.

---

## Environment Variables

All `.env*` files are gitignored. Use `.env.local` for local development secrets.
Required env vars should be validated at startup (e.g., database URL, auth secrets).
Never commit secrets or API keys.

---

## Key Documentation

- `docs/PRD.md` — Product requirements, database schema, feature specs.
- `docs/TECH_SPEC.md` — Technical specification (overlaps with PRD, slightly older).
- PRD is the canonical source when specs diverge.