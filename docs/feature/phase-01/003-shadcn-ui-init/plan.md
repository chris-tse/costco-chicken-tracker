---
status: pending
---

# 003 — Shadcn UI Initialization

## Phase
1 — Foundation

## Goal
Initialize Shadcn UI, install core component primitives, establish project design tokens, and replace the default Next.js scaffolding homepage with a minimal project-branded landing page.

## Prerequisites
- None strictly, but should follow 001 and 002 so the homepage can reflect auth state

## References
- `docs/PRD.md` line 35 — Shadcn in tech stack
- `AGENTS.md` — styling guidelines (Tailwind v4, CSS custom properties, dark mode via `prefers-color-scheme`)
- Shadcn docs: https://ui.shadcn.com/docs/installation/next

## Scope

### 1. Initialize Shadcn
- Run the Shadcn CLI init command (`bunx shadcn@latest init` or equivalent)
- Research: Shadcn + Tailwind CSS v4 compatibility. Tailwind v4 uses a different config approach (CSS-based, no `tailwind.config.js`). Verify Shadcn's init works with this setup or document any workarounds needed.
- Configure:
  - Style: default (or new-york — pick one, document choice)
  - Base color: neutral (can be customized later)
  - CSS variables: yes
  - Path alias: `@/components`
  - Utility path: `@/lib/utils`

### 2. Install core component primitives
Install these components via `bunx shadcn@latest add`:
- `button` — used everywhere
- `input` — forms
- `label` — form labels
- `popover` — heatmap cell detail (Phase 3)
- `dialog` — confirmation modals
- `table` — admin views (Phase 4)
- `card` — layout containers
- `badge` — status indicators
- `dropdown-menu` — user menu, nav
- `separator` — visual dividers
- `toast` / `sonner` — feedback on actions

### 3. Establish project design tokens
- Update `app/globals.css`:
  - Keep the Tailwind v4 import
  - Define project-specific CSS custom properties beyond the defaults:
    - Primary/accent colors (research Costco brand colors: red `#E31837`, blue `#005DAA` — use as inspiration, not exact match to avoid trademark issues)
    - Semantic tokens: `--success`, `--warning`, `--error`
    - Heatmap color scale tokens (cold → hot range, will be used in Phase 3)
  - Ensure dark mode tokens are defined via `prefers-color-scheme` media query
- Do NOT hardcode colors in components — always reference design tokens

### 4. Replace scaffolding homepage
- Rewrite `app/page.tsx`:
  - Remove all default Next.js starter content
  - Minimal branded landing page:
    - Project name / tagline
    - Brief description of what the app does
    - CTA button: "Sign In" (links to `/sign-in`) or "Get Started"
    - If auth is wired up (002 complete), show different state for authenticated users
  - Server Component by default
- Rewrite `app/layout.tsx`:
  - Update metadata: `title`, `description` to reflect the actual project
  - Keep Geist fonts (they work well for this kind of app)
  - Add a minimal header/nav shell (can be empty for now, will be populated as features land)

### 5. Utility setup
- Shadcn typically creates `lib/utils.ts` with the `cn()` classname merge helper
- Verify this is created and uses `clsx` + `tailwind-merge`
- Ensure it's importable via `@/lib/utils`

## Key Decisions to Research
- Shadcn + Tailwind CSS v4 compatibility (v4 dropped `tailwind.config.js` in favor of CSS-based config). Shadcn may need specific setup steps.
- Style preset choice (default vs new-york) — compare and pick based on the app's needs
- Whether to use `sonner` (standalone) or Shadcn's `toast` for notifications

## Verification
- `bun run build` succeeds (no build errors)
- `bun run lint` passes
- `bunx tsc --noEmit` passes
- Homepage renders without the default Next.js scaffolding
- Dark mode toggles correctly via system preference
- All installed Shadcn components import without errors
- Responsive layout works on mobile and desktop viewports

## Output
- `components/ui/` — Shadcn component files (button, input, etc.)
- `lib/utils.ts` — `cn()` helper
- Updated `app/globals.css` — design tokens
- Updated `app/page.tsx` — project landing page
- Updated `app/layout.tsx` — project metadata + nav shell
- `components.json` — Shadcn config file
- Updated `package.json` (new deps from Shadcn: likely `clsx`, `tailwind-merge`, `@radix-ui/*`, `lucide-react`)
