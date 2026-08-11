---
status: pending
---

# 012 — Error Boundaries & Loading States

## Phase
5 — User Experience & Polish

## Goal
Add proper error boundaries, loading states, and not-found handling across all routes to create a polished, resilient user experience.

## Prerequisites
- All feature pages from Phases 1-4 should exist (this task adds polish to them)

## References
- `AGENTS.md` — error handling guidelines (use `error.tsx` boundaries, structured error objects from server actions)
- Next.js App Router docs on error handling, loading, and not-found

## Scope

### 1. Root error boundary
- Location: `app/error.tsx`
- Client Component (`"use client"` required by Next.js)
- Catches unhandled errors at the app level
- Shows:
  - Friendly error message (not raw error details)
  - "Try Again" button (calls `reset()` from Next.js error boundary props)
  - "Go Home" link
- Log errors to console in development (consider future error reporting service)

### 2. Route-level error boundaries
- Add `error.tsx` to routes where specific error handling is needed:
  - `app/store/[id]/error.tsx` — handles store not found, failed heatmap query, etc.
  - `app/admin/error.tsx` — handles admin-specific errors
  - `app/log/error.tsx` — handles submission errors not caught by the form
- Each can have contextually relevant messaging

### 3. Loading states
- Add `loading.tsx` to routes with data fetching:
  - `app/store/[id]/loading.tsx` — skeleton of heatmap + header while data loads
  - `app/store/loading.tsx` — skeleton of store selector
  - `app/admin/submissions/loading.tsx` — skeleton table
  - `app/admin/invite-codes/loading.tsx` — skeleton table
  - `app/settings/loading.tsx` — skeleton of settings form
- Use Shadcn `Skeleton` component (install if not already present)
- Loading states should match the layout of the actual content (skeleton screens, not spinners)

### 4. Not-found handling
- `app/not-found.tsx` — root-level 404 page
  - Friendly messaging
  - Search or link to store finder
  - Link to home
- `app/store/[id]/not-found.tsx` — store-specific 404
  - "Store not found" with link to store selector
  - Call `notFound()` from the page component when store ID doesn't exist

### 5. Server action error patterns
- Audit all existing server actions to ensure they return structured errors:
  ```ts
  type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; code?: string }
  ```
- Never throw from server actions — always return error objects
- Client components should handle both success and error states gracefully
- Show errors via Shadcn toast or inline error messages

### 6. Form validation feedback
- Audit all forms (sighting submission, settings, admin actions):
  - Client-side validation with immediate feedback
  - Server-side validation errors displayed next to relevant fields
  - Disabled submit buttons during pending state
  - Use `useFormStatus` or `useActionState` from React for pending states

### 7. Network error handling
- Handle offline/network failure states:
  - Show a banner when fetch fails due to network
  - Retry logic for failed data fetches (optional for MVP)
- GPS permission denied: graceful fallback (manual store selection)

## Key Decisions to Research
- Whether to use a global error reporting service (Sentry, etc.) or just console logging for now
- Skeleton component patterns: Shadcn Skeleton vs custom shimmer
- Whether to add a global "offline" banner using service worker or navigator.onLine

## Verification
- Every route has appropriate loading and error states
- Navigating to a non-existent store ID shows the store 404 page
- Navigating to a non-existent route shows the root 404 page
- Server action errors are displayed to the user, not silently swallowed
- Loading skeletons match the layout of the loaded content
- `bun run build` succeeds with all error boundaries in place
- `bunx tsc --noEmit` passes
- `bun run lint` passes

## Output
- `app/error.tsx`
- `app/not-found.tsx`
- `app/store/[id]/error.tsx`
- `app/store/[id]/loading.tsx`
- `app/store/[id]/not-found.tsx`
- `app/store/loading.tsx`
- `app/admin/error.tsx`
- `app/admin/submissions/loading.tsx`
- `app/admin/invite-codes/loading.tsx`
- `app/log/error.tsx`
- `app/settings/loading.tsx`
- Audit and updates to all existing server actions and forms
