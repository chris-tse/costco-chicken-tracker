---
status: pending
---

# 011 — User Profile & Settings

## Phase
5 — User Experience & Polish

## Goal
Build the user profile settings page where users can set their default store and commute time, and manage their account.

## Prerequisites
- 001-database-setup (users table with `default_store_id`, `commute_minutes`)
- 002-auth-setup (authenticated session)
- 004-store-data-pipeline (stores for the default store selector)

## References
- `docs/PRD.md` lines 140-142 — user profile settings spec
- `docs/PRD.md` lines 72-81 — `users` schema

## Scope

### 1. Profile settings page
- Location: `app/settings/page.tsx`
- Authenticated route (redirect to sign-in if not logged in)
- Sections:

#### Account info (read-only)
- Name (from OAuth)
- Email (from OAuth)
- Profile image (from OAuth)
- Member since (from `created_at`)

#### Default store
- Current default store displayed (name, city, state)
- "Change" button opens the store selector (reuse from 005)
- GPS auto-suggestion on first visit if no default set:
  1. Request location permission
  2. Find nearest store
  3. Suggest: "Set [Store Name] as your default store?"
  4. User confirms or picks a different one
- Server action to update `users.default_store_id`

#### Commute time
- Number input or slider: 5-120 minutes
- Current value pre-filled from `users.commute_minutes`
- Save on change (debounced server action)
- Explanation text: "Used to calculate the probability of fresh chicken during your commute window"

### 2. Server actions
- Location: `lib/actions/user.ts` (may already exist from 007)
- `updateDefaultStore(storeId: number)` — validate store exists and is active
- `updateCommuteMinutes(minutes: number)` — validate 1-120 range
- Both verify authenticated caller and update the correct user record

### 3. First-login onboarding flow
- After first OAuth signup, redirect to `/settings` (or a `/welcome` page)
- Prompt to set default store via GPS
- Prompt to set commute time
- "Get Started" CTA that goes to the store view
- This can be a simple version of the settings page with a welcome message, not a separate flow

### 4. User menu integration
- Add a user dropdown menu in the app header (from 003):
  - User avatar + name
  - "Settings" link → `/settings`
  - "Sign Out" action
- Uses Shadcn `DropdownMenu` component

### 5. Layout metadata update
- Update `app/layout.tsx`:
  - Final project title and description
  - Proper favicon (replace Next.js default — even a simple text-based one)
  - OpenGraph metadata for social sharing

## Key Decisions to Research
- Whether to use a dedicated onboarding flow (`/welcome`) or just redirect to `/settings` after first signup
- Avatar handling: just use the OAuth image directly, or create a local avatar system?
- Whether to add a "Delete Account" option (GDPR-like, not in PRD but good practice)

## Verification
- Settings page renders with current user data
- Default store can be changed and persists
- Commute time can be changed and persists
- GPS auto-suggestion works on first visit
- User menu shows in header with correct links
- Sign out works
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- Responsive on mobile

## Output
- `app/settings/page.tsx`
- Updated `lib/actions/user.ts`
- User menu component in header
- Updated `app/layout.tsx` (metadata, favicon)
