# AGENTS.md

## Project Overview

CostcoChickenTracker — a TanStack Start (Vite-based) web app for crowdsourcing Costco
rotisserie chicken batch timestamps and visualizing probability heatmaps. Full-stack
TypeScript, single repo. Early stage (core features not yet built).

---

## Commands

```bash
bun install                               # Install dependencies
bun run dev                               # Development server (http://localhost:3000)
bun run build                             # Production build
bun run start                             # Start production server
bun run check                             # lint check
bun run fix                               # lint fix
bun run typecheck                         # Type-check without emitting
bun run test                              # Run all tests
bunx vitest run path/to/file.test.ts      # Run a single test file
bunx vitest run -t "pattern"              # Run tests matching a pattern
bunx vitest watch                         # Watch mode
```

Testing uses **Vitest** + **React Testing Library** (`@testing-library/react`,
`@testing-library/jest-dom`) with `jsdom` as the environment.

---

## Code Style Guidelines

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity. Biome (via Ultracite) enforces most formatting and lint rules automatically — run `bunx ultracite fix` before committing.

### TypeScript

- **Strict mode** is on (`"strict": true` in tsconfig.json).
- Target: ES2017. Module: ESNext with bundler resolution.
- Use `type` imports for type-only imports: `import type { Foo } from "bar"`.
- Path alias: `@/*` maps to `src/`. Use `@/app/...`, `@/lib/...`, etc.
- Prefer explicit return types on exported functions.
- No `any` — use `unknown`, narrow with type guards, and leverage TypeScript's type narrowing instead of type assertions.
- Use const assertions (`as const`) for immutable values and literal types.
- Use meaningful variable names instead of magic numbers — extract constants with descriptive names.

### Imports

- Order: (1) React/TanStack, (2) third-party, (3) internal `@/` aliases, (4) relative.
- Separate groups with a blank line.
- Use named exports for components and utilities. Default exports are not
  required by TanStack Start (unlike Next.js).
- Prefer specific imports over namespace imports. Avoid barrel files (index files that re-export everything).

```tsx
import type { FileRoute } from "@tanstack/react-router";

import { someUtil } from "@/lib/utils";

import "./globals.css";
```

### React / TanStack Start

- **File-based routing** via TanStack Router. Routes go in `src/app/` as `.tsx` files.
- Route definitions use `createFileRoute` or `createRootRoute` with `component`, `loader`, `beforeLoad`, etc.
- Data fetching uses route `loader` functions and `createServerFn` from `@tanstack/react-start`.
- Layouts use pathless routes (e.g., `_protected.tsx`) or `__root.tsx` for the root layout.
- Use `<Outlet />` for nested route rendering and `<HeadContent />` / `<Scripts />` in the root layout.
- Props types: inline `Readonly<{}>` wrapper or named interfaces.
- Use function components over class components. Use ref as a prop instead of `React.forwardRef` (React 19+).
- Call hooks at the top level only, never conditionally. Specify all dependencies in hook dependency arrays correctly.
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices).
- Nest children between opening and closing tags instead of passing as props.
- Don't define components inside other components.
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images.
  - Use proper heading hierarchy.
  - Add labels for form inputs.
  - Include keyboard event handlers alongside mouse events.
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles.

### Styling

- **Tailwind CSS v4** via Vite plugin (not the older PostCSS-based setup).
- Utility-first classes directly in JSX `className`.
- CSS custom properties defined in `app/globals.css`.
- Dark mode via `prefers-color-scheme` media query and `dark:` variants.
- Use the project's design tokens (`--background`, `--foreground`, `--font-sans`,
  `--font-mono`) rather than hardcoding colors.

### Naming Conventions

- **Files**: `kebab-case` for utility files, `PascalCase.tsx` for components (or
  follow TanStack Start conventions like `__root.tsx`, `index.tsx`, `$param.tsx`).
- **Components**: PascalCase (`RootLayout`, `Home`).
- **Functions/variables**: camelCase.
- **Types/interfaces**: PascalCase, prefer `type` over `interface` unless extending.
- **Constants**: UPPER_SNAKE_CASE for true constants, camelCase for config objects.
- **Database columns**: snake_case (matching Drizzle schema conventions).

### Error Handling

- Use route-level error boundaries or `errorComponent` in route definitions for page-level errors.
- Server functions should return structured error objects, not throw.
- For Effect-based code: use typed errors in the error channel, not exceptions.
- Validate and sanitize all user input on the server side (timestamps, GPS, rate limits).
- Throw `Error` objects with descriptive messages, not strings or other values.
- Use `try-catch` blocks meaningfully — don't catch errors just to rethrow them.
- Remove `console.log`, `debugger`, and `alert` statements from production code.
- Prefer early returns over nested conditionals for error cases.

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions.
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops.
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access.
- Prefer template literals over string concatenation.
- Use destructuring for object and array assignments.
- Use `const` by default, `let` only when reassignment is needed, never `var`.

### Async & Promises

- Always `await` promises in async functions — don't forget to use the return value.
- Use `async/await` syntax instead of promise chains for better readability.
- Handle errors appropriately in async code with try-catch blocks.
- Don't use async functions as Promise executors.

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits.
- Extract complex conditions into well-named boolean variables.
- Use early returns to reduce nesting.
- Prefer simple conditionals over nested ternary operators.
- Group related code together and separate concerns.

### Security

- Add `rel="noopener"` when using `target="_blank"` on links.
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary.
- Don't use `eval()` or assign directly to `document.cookie`.

### Performance

- Avoid spread syntax in accumulators within loops.
- Use top-level regex literals instead of creating them in loops.

### Formatting

- 2-space indentation.
- Double quotes for strings in JSX attributes and imports.
- Semicolons at end of statements.
- Trailing commas in multi-line structures.
- Max line length: ~100 characters (soft limit, break JSX as needed).

---

## Key Documentation

- `docs/PRD.md` — Product requirements, database schema, feature specs.
- `docs/decisions.md` — Overarching decision making log

### Feature Documentation

Implementation plan has been broken down into a structure like `feature/phase-XX/YYY-feature-name`. Each of these directories will have a `plan.md` that contains what needs to be done for each feature and phase. If a `research.md` doesn't exist in that directory, create one. When the user asks any investigative questions or queries, note them down in there. When a decision is made either way that diverges from the plan.md, note them in decisions.md following the existing format.

---

## Testing

- Write assertions inside `it()` or `test()` blocks.
- Avoid done callbacks in async tests — use async/await instead.
- Don't use `.only` or `.skip` in committed code.
- Keep test suites reasonably flat — avoid excessive `describe` nesting.

---

## What Biome/Ultracite Can't Catch

Biome's linter will catch most style and correctness issues automatically. Focus your attention on:

1. **Business logic correctness** — Biome can't validate your algorithms.
2. **Meaningful naming** — Use descriptive names for functions, variables, and types.
3. **Architecture decisions** — Component structure, data flow, and API design.
4. **Edge cases** — Handle boundary conditions and error states.
5. **User experience** — Accessibility, performance, and usability considerations.
6. **Documentation** — Add comments for complex logic, but prefer self-documenting code.
