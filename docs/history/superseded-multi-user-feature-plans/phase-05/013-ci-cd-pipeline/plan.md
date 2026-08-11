---
status: pending
---

# 013 — CI/CD Pipeline

## Phase
5 — User Experience & Polish

## Goal
Set up GitHub Actions CI pipeline for automated linting, type-checking, and testing on every PR. Ensure Vercel preview deployments work correctly.

## Prerequisites
- All previous phases (CI validates the whole codebase)
- Tests from various features should exist

## References
- `AGENTS.md` — commands reference (lint, type-check, test commands)
- Vercel docs on GitHub integration and preview deployments

## Scope

### 1. CI workflow
- Location: `.github/workflows/ci.yml`
- Trigger: `push` to `main`, `pull_request` to `main`
- Steps:
  1. **Checkout** — `actions/checkout@v4`
  2. **Setup Bun** — `oven-sh/setup-bun@v2` (research latest version)
  3. **Install dependencies** — `bun install --frozen-lockfile`
  4. **Lint** — `bun run lint`
  5. **Type check** — `bunx tsc --noEmit`
  6. **Test** — `bunx vitest run`
  7. **Build** — `bun run build` (catches build-time errors not caught by tsc)
- Fail fast: if any step fails, the whole workflow fails
- Matrix: single Node/Bun version for now (no need for multi-version testing)

### 2. Caching
- Cache Bun's install cache (`~/.bun/install/cache`) between runs
- Cache `.next` build cache for faster builds
- Research: correct cache key strategy (hash of `bun.lock`)

### 3. PR status checks
- Configure the CI workflow as a required status check for merging to `main`
- Research: how to set this up in GitHub repo settings (branch protection rules)

### 4. Vercel integration
- Vercel likely already auto-deploys if the repo is connected
- Verify:
  - Preview deployments created for each PR
  - Production deployment on merge to `main`
  - Environment variables set in Vercel dashboard
- If not connected, document the setup steps

### 5. Environment handling
- CI workflow needs `DATABASE_URL` for build (Drizzle schema import)
- Options:
  - Use a test/mock database URL in CI
  - Skip DB-dependent steps in CI
  - Use GitHub Secrets for a CI-specific database
- Research: can `bun run build` succeed without a real DATABASE_URL? (depends on whether the DB client is imported at build time)

### 6. Test reporting (optional)
- Consider adding test result reporting:
  - Vitest JSON reporter output
  - GitHub Actions annotations for test failures
  - Coverage reporting (if coverage is set up)
- This is nice-to-have for MVP

## Key Decisions to Research
- Whether `bun run build` needs a real DATABASE_URL or can work with a placeholder
- Whether to run the store sync GHA (004) as part of CI or keep it separate
- Cache key strategy for Bun
- Whether to add a Playwright/E2E test step (probably Phase 6)

## Verification
- CI workflow runs on PR creation
- All steps pass on a clean codebase
- Failing lint/types/tests correctly blocks the PR
- Vercel preview deployment is created for PRs
- Production deploys on merge to main
- Workflow completes in a reasonable time (< 5 minutes ideally)

## Output
- `.github/workflows/ci.yml`
- Branch protection rules documentation (or apply directly)
- Vercel connection verification
