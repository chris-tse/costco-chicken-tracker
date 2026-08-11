# Research: Shadcn UI + Tailwind CSS v4 Compatibility

_Researched: 2026-03-01_

---

## 1. `bunx shadcn@latest init` with Tailwind CSS v4 (no `tailwind.config.js`)

### Status: Fully Supported (as of February 2025)

The February 2025 shadcn changelog (`/docs/changelog/2025-02-tailwind-v4`) confirmed first-class
Tailwind v4 support. The CLI was updated to initialize projects with Tailwind v4 and fully supports
the `@theme` directive and `@theme inline` option. All components were updated for Tailwind v4 and
React 19.

### The Key Change: `tailwind.config` is left blank

In `components.json`, the `tailwind.config` field is explicitly left empty for Tailwind v4 projects:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

The official docs note: _"Path to where your `tailwind.config.js` file is located. For Tailwind CSS
v4, leave this blank."_

### Init command (no special flags needed)

```bash
bunx shadcn@latest init
```

The CLI is interactive and will detect Tailwind v4 automatically. There are no special flags required
for CSS-based config. Available flags:

- `-t, --template` — template preset (`next` or `next-monorepo`)
- `-b, --base-color` — base color (`neutral`, `gray`, `zinc`, `stone`, `slate`)

For this project, run it interactively to select `new-york` style, `neutral` base color, and confirm
CSS variable usage.

### CSS configuration format change (v3 → v4)

Shadcn shifts from `@layer base` with space-separated HSL values to a CSS variable + `@theme inline`
pattern using full `hsl()` functions. Colors are now OKLCH internally.

**Old v3 pattern:**
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
  }
}
```

**New v4 pattern (what shadcn init will inject):**
```css
:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

This is compatible with the existing `globals.css` in this project, which already uses `@theme
inline`. The init command will merge its variables into the existing CSS file — review the diff
afterward to ensure the existing `@import "tailwindcss" source("../")` directive is preserved.

### Animation library change

`tailwindcss-animate` is deprecated; new projects install `tw-animate-css` by default. The shadcn
init will handle this automatically.

### Known bug: Tailwind v4 detection failure

There is an open bug ([#7952](https://github.com/shadcn-ui/ui/issues/7952),
[#6446](https://github.com/shadcn-ui/ui/issues/6446)) where the CLI shows:
```
✖ Validating Tailwind CSS config. Found v4
```
and then fails to locate a config file. Reported workaround: run `bunx shadcn@latest init` directly
(do not `bun add shadcn` first). The CLI detects from the installed `tailwindcss` package version,
not from a config file.

### TanStack Start: CLI component installation bug

There is a known bug ([#7084](https://github.com/shadcn-ui/ui/issues/7084)) where the CLI
constructs a malformed URL (`styles//button.json` with double slash) when adding components in a
TanStack Start project. Root cause: the `style` property in `components.json` is not being read
correctly.

**Workaround:** If `bunx shadcn@latest add button` fails, try:
1. Ensure `components.json` has `"style": "new-york"` explicitly set (not empty/undefined).
2. Use `bunx shadcn@canary add button` if the stable CLI has the issue.
3. As last resort, manually copy components from https://ui.shadcn.com/docs/components and install
   Radix peer deps by hand.

The TanStack Start official docs also provide a project scaffold command:
```bash
bunx create @tanstack/start@latest --tailwind --add-ons shadcn
```
But since this project is already initialized, only the component-add workflow applies.

---

## 2. Default vs New-York Style Presets

### Decision: **new-york**

### Detailed Differences

| Attribute            | default                    | new-york                   |
|----------------------|----------------------------|----------------------------|
| Input/button height  | 40px (`h-10`)              | 36px (`h-9`) — more compact |
| Shadows              | None (flat)                | `shadow-sm` on interactive elements |
| Card title size      | `text-2xl` (1.5rem)        | `text-base` (1rem)         |
| Focus ring           | 2px outline, 2px offset    | 1px outline, 0px offset    |
| Border radius        | `rounded-lg`               | `rounded-xl` (cards, badges) |
| Icon library         | `lucide-react`             | `lucide-react` (post-2025, Radix Icons removed) |
| Radix dependency     | individual `@radix-ui/react-*` | single `radix-ui` package (as of Feb 2026) |

### Why new-york for a data-focused app

- **Compact height (36px vs 40px)** — tables, filters, and form controls pack more information into
  the viewport without scrolling, directly benefiting a heatmap/data-browsing app.
- **Subtle shadows** — provides visual hierarchy for cards and panels without visual clutter, which
  helps distinguish data regions.
- **Smaller typography** — `text-base` card titles keep labels readable without occupying
  disproportionate space relative to data content.
- **Deprecation direction** — as of the February 2025 release, shadcn explicitly deprecated the
  default style. New projects should use `new-york`. The default style chooser was removed from the
  shadcn website preview UI around that time.
- **Cleaner dependency** — `new-york` now uses the unified `radix-ui` package (single dep) instead
  of multiple `@radix-ui/react-*` packages.

The `default` style suits landing pages and marketing sites where spacious, flat design aids
readability. For SaaS dashboards, data tables, and form-heavy UIs — this app's profile — `new-york`
is the correct choice and also the future-proof one.

---

## 3. Sonner vs Shadcn Toast for Notifications

### Decision: **sonner**

### Status of Built-in Toast

The shadcn `toast` component (backed by `@radix-ui/react-toast`) was officially deprecated in the
February 2025 release in favor of `sonner`. Issue
[#7120](https://github.com/shadcn-ui/ui/issues/7120) tracks its eventual removal from docs.
New projects should not install `toast`; `sonner` is the replacement.

### Comparison

| Attribute           | toast (deprecated)                       | sonner (recommended)               |
|---------------------|------------------------------------------|------------------------------------|
| Status              | Deprecated Feb 2025                      | Active, maintained                 |
| Underlying library  | `@radix-ui/react-toast`                  | `sonner` by Emil Kowalski          |
| Multi-toast stacking| No elegant stacking                      | Staggered stack, expands on hover  |
| Animations          | Basic                                    | Polished spring animations         |
| API surface         | Requires `useToast()` hook               | Call `toast()` directly anywhere   |
| Promise toasts      | Manual state management                  | `toast.promise()` built-in         |
| Toast types         | Manual variant prop                      | `.success()`, `.error()`, `.warning()`, `.info()` |
| Usage outside React | No (hook-based)                          | Yes (plain function call)          |

### Sonner usage pattern

Install:
```bash
bunx shadcn@latest add sonner
```

Add `<Toaster />` to the root layout (`src/app/__root.tsx`):
```tsx
import { Toaster } from "@/components/ui/sonner";

// inside the root component JSX, alongside <Outlet />:
<Toaster />
```

Trigger from any file (no hook required):
```tsx
import { toast } from "sonner";

toast("Batch reported successfully.");
toast.success("Saved!");
toast.error("Failed to submit. Try again.");
toast.promise(submitReport(), {
  loading: "Submitting...",
  success: "Batch reported!",
  error: "Submission failed.",
});
```

### Why sonner for this app

For a crowdsourced reporting app, notifications will appear in response to form submissions
(`toast.promise` for async submit flows) and validation errors. Sonner's `toast.promise()` API is
a perfect fit. The direct function-call API also means notifications can be triggered from server
function callbacks without prop-drilling a toast function through components.

---

## 4. Known Issues: Shadcn + TanStack Start + Tailwind v4

### Issue 1: CLI component installation — double-slash URL bug

- **Bug:** `bunx shadcn@latest add <component>` constructs `styles//button.json` (missing style
  segment), causing a 404.
- **Tracking:** [#7084](https://github.com/shadcn-ui/ui/issues/7084)
- **Status:** Open as of late 2025. Reproduced on `shadcn@2.9.2`.
- **Workaround:** Explicitly verify `"style": "new-york"` is set in `components.json` before
  running `add`. If it still fails, try `bunx shadcn@canary add <component>` or copy components
  manually from the shadcn docs website.

### Issue 2: Tailwind v4 config detection failure

- **Bug:** CLI reports "Validating Tailwind CSS config. Found v4" but then errors because it looks
  for a `tailwind.config.js` that doesn't exist.
- **Tracking:** [#7952](https://github.com/shadcn-ui/ui/issues/7952),
  [#6446](https://github.com/shadcn-ui/ui/issues/6446)
- **Status:** Multiple confirmations as of September 2025; unclear if fully fixed in latest stable.
- **Workaround:** Run `bunx shadcn@latest init` directly (do not pre-install shadcn as a dep).
  Ensure `tailwindcss` v4 is in `package.json` so the CLI version-detects correctly.

### Issue 3: `components.json` `tailwind.config` field

- In TanStack Start projects, if the config was generated with an older shadcn version, it may
  still point to a `tailwind.config.ts` path.
- Fix: Open `components.json` and set `"config": ""` under the `tailwind` key.

### Issue 4: Animation and color migration

- `tailwindcss-animate` is no longer used; new projects get `tw-animate-css`.
- If the project was scaffolded before Feb 2025, manually swap the dependency.
- HSL color values in shadcn CSS variables are automatically output as OKLCH internally by Tailwind
  v4 — no manual migration needed, but be aware when reading browser DevTools.

### Issue 5: Monorepo / path resolution (not applicable here, noted for completeness)

- In monorepo setups, Tailwind v4's `source()` directive must be correctly scoped to the package's
  `src/` directory. This project already has `@import "tailwindcss" source("../")` which is correct
  for a single-package repo.

### Safe init sequence for this project

Given the above, the safest init sequence is:

```bash
# 1. Ensure shadcn is NOT a local dep (use bunx, not a locally installed binary)
# 2. Run init interactively — answer: new-york, neutral, yes to CSS vars
bunx shadcn@latest init

# 3. Verify components.json was created correctly:
#    - "style": "new-york"
#    - "tailwind.config": ""
#    - "tailwind.css": "src/app/globals.css"
#    - aliases use "@/" prefix

# 4. Add components — if double-slash bug hits, try canary:
bunx shadcn@latest add button input label popover dialog table card badge dropdown-menu separator sonner
# fallback:
bunx shadcn@canary add button  # etc.

# 5. Review globals.css changes — preserve @import "tailwindcss" source("../")
```

---

## Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tailwind v4 init | `bunx shadcn@latest init`, no special flags | CLI detects v4 automatically; leave `tailwind.config` blank in components.json |
| Style preset | `new-york` | More compact (36px), subtle shadows, officially preferred; default deprecated Feb 2025 |
| Toast library | `sonner` | Built-in toast deprecated; sonner has better API, animations, and `toast.promise()` support |
| Known issues | See above | Double-slash URL bug on TanStack Start; Tailwind v4 detection bug — workarounds documented |
