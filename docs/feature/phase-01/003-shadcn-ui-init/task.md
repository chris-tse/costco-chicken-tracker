# 003 Shadcn UI Initialization — Tasks

Each task below is independently executable. Tasks are ordered by dependency.
Status key: `[ ]` pending, `[~]` in progress, `[x]` done, `[-]` skipped/cancelled.

---

## Task 1: Research Shadcn + Tailwind CSS v4 compatibility

- [ ] Check latest Shadcn docs for Tailwind v4 support and any special init flags
- [ ] Verify whether `bunx shadcn@latest init` works with CSS-based Tailwind v4 config (no `tailwind.config.js`)
- [ ] Compare `default` vs `new-york` style presets — pick one and document rationale
- [ ] Decide between `sonner` (standalone) vs Shadcn `toast` for notifications
- [ ] Document findings in `research.md` in this directory

**Verify:** `research.md` exists with clear decisions recorded

---

## Task 2: Initialize Shadcn CLI

- [ ] Run `bunx shadcn@latest init` (with appropriate flags for Tailwind v4 if needed)
  - Style: chosen preset from Task 1
  - Base color: neutral
  - CSS variables: yes
  - Components path: `src/components/ui`
  - Utils path: `src/lib/utils.ts`
- [ ] Verify `components.json` is created at project root with correct path aliases (`@/`)
- [ ] Verify `src/lib/utils.ts` is created with `cn()` helper using `clsx` + `tailwind-merge`
- [ ] Ensure `src/lib/utils.ts` is importable as `@/lib/utils`
- [ ] Review any changes Shadcn made to `src/app/globals.css` — preserve the existing Tailwind v4 `@import "tailwindcss" source("../")` directive

**Files:** `components.json`, `src/lib/utils.ts`, `src/app/globals.css`, `package.json`
**Depends on:** Task 1
**Verify:** `bunx tsc --noEmit` passes, `cn()` can be imported from `@/lib/utils`

---

## Task 3: Install core component primitives

- [ ] Install components via `bunx shadcn@latest add`:
  - `button`
  - `input`
  - `label`
  - `popover`
  - `dialog`
  - `table`
  - `card`
  - `badge`
  - `dropdown-menu`
  - `separator`
  - `sonner` or `toast` (per Task 1 decision)
- [ ] Verify all components are created under `src/components/ui/`
- [ ] Verify all Radix UI and other peer dependencies are installed in `package.json`

**Files:** `src/components/ui/*.tsx`, `package.json`
**Depends on:** Task 2
**Verify:** `bunx tsc --noEmit` passes, all component files exist and import without errors

---

## Task 4: Establish project design tokens

- [ ] Update `src/app/globals.css` with project-specific CSS custom properties:
  - Primary/accent colors (Costco-inspired — red/blue as inspiration, not exact brand colors)
  - Semantic tokens: `--success`, `--warning`, `--error`
  - Heatmap color scale tokens (cold-to-hot range, 5–7 steps for Phase 3)
- [ ] Define dark mode variants for all custom tokens via `prefers-color-scheme` media query
- [ ] Ensure Shadcn's default CSS variables (`:root` and `.dark`) integrate cleanly with the existing Tailwind v4 `@theme inline` block
- [ ] Register custom colors in `@theme inline` so they're usable as Tailwind utilities

**File:** `src/app/globals.css`
**Depends on:** Task 2
**Verify:** `bun run build` succeeds, dark mode tokens resolve correctly

---

## Task 5: Update root layout with project metadata and nav shell

- [ ] Update `src/app/__root.tsx`:
  - Set `<title>` to "Costco Chicken Tracker"
  - Add `<meta name="description" ...>` with a project-appropriate description
  - Keep existing Geist fonts (or current font setup)
  - Add a minimal `<header>` / `<nav>` shell (can be empty/placeholder, will be populated later)
  - Wrap `<Outlet />` in a `<main>` element for semantic HTML

**File:** `src/app/__root.tsx`
**Depends on:** Task 4
**Verify:** `bunx tsc --noEmit` passes, layout renders with updated metadata

---

## Task 6: Replace scaffolding homepage with branded landing page

- [ ] Rewrite `src/app/index.tsx`:
  - Remove all default scaffolding content
  - Add project name and tagline
  - Add brief description of what the app does
  - Add CTA button using Shadcn `Button` component: "Sign In" linking to `/sign-in`
  - If auth is available (check for auth session hook), show different state for authenticated users (e.g., "Go to Dashboard" or welcome message)
  - Use design tokens from Task 4 — no hardcoded colors
  - Keep as a server-compatible component where possible
- [ ] Ensure responsive layout works on mobile and desktop viewports

**Files:** `src/app/index.tsx`
**Depends on:** Task 3, Task 4, Task 5
**Verify:** `bunx tsc --noEmit` passes, page renders without default Next.js/scaffolding content

---

## Final verification

- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run check` passes (run `bun run fix` if needed)
- [ ] `bun run build` succeeds
- [ ] All output files exist per plan.md:
  - `components.json`
  - `src/lib/utils.ts`
  - `src/components/ui/` with all listed components
  - Updated `src/app/globals.css`
  - Updated `src/app/__root.tsx`
  - Updated `src/app/index.tsx`
- [ ] Homepage renders with project branding (no default scaffolding)
- [ ] Dark mode toggles correctly via system preference
- [ ] All installed Shadcn components import without errors
- [ ] Update `plan.md` status from `pending` to `done`

---

## Manual E2E Testing

- [ ] `bun run dev` — homepage shows project-branded landing page
- [ ] Toggle system dark mode — colors update correctly
- [ ] "Sign In" CTA navigates to `/sign-in`
- [ ] Resize viewport — layout is responsive on mobile and desktop
- [ ] Import and render each Shadcn component in isolation (spot check 2–3)

---

## Notes

- **Prefer CLI commands over manual file creation.** Use `bunx shadcn@latest init` and
  `bunx shadcn@latest add <component>` to generate config and component files rather than
  writing them by hand. Only manually edit files that need project-specific customization
  (e.g., `globals.css` design tokens, `__root.tsx` metadata, `index.tsx` landing page).
- Tailwind v4 uses CSS-based config (`@import "tailwindcss"`, `@theme inline`) — no `tailwind.config.js`. Shadcn init may need special handling for this.
- Existing `src/lib/utils/` directory exists — Shadcn's `utils.ts` goes at `src/lib/utils.ts` (file, not directory). Ensure no conflicts.
- Auth pages already exist at `/sign-in` and `/sign-up` from feature 002.
- Use `bunx` for all CLI tool invocations.
- Costco brand colors (red `#E31837`, blue `#005DAA`) are for **inspiration only** — use similar but distinct colors to avoid trademark concerns.
