---
status: pending
---

# 009 — Admin Submissions View

## Phase
4 — Moderation & Admin

## Goal
Build the admin submissions tab where admins can review flagged sightings, approve or reject them, and see algorithm suggestions. This is the moderation interface that controls data quality in the heatmap.

## Prerequisites
- 001-database-setup (schema with `chicken_sightings`)
- 002-auth-setup (need admin role/check)
- 005-sighting-submission (data to review)

## References
- `docs/PRD.md` lines 186-197 — admin submissions tab spec
- `docs/PRD.md` lines 95-111 — `chicken_sightings` schema (flagging columns)

## Scope

### 1. Admin role / access control
- Research: how to implement admin roles with Better Auth
  - Options: a role field on the `users` table, a separate `admins` table, or Better Auth's built-in role system
  - Simplest for MVP: add an `is_admin BOOLEAN DEFAULT false` column to `users`, or use an env-var allowlist of admin email addresses
- Create admin middleware or layout guard:
  - All `/admin/*` routes require authentication AND admin role
  - Non-admins get a 403 or redirect

### 2. Admin layout
- Location: `app/admin/layout.tsx`
- Shared layout for all admin pages:
  - Tab navigation: "Submissions" | "Invite Codes" (010)
  - Auth + admin check (redirect if not admin)
  - Minimal styling — functional over pretty

### 3. Submissions table page
- Location: `app/admin/submissions/page.tsx`
- Server Component that fetches flagged submissions
- Query: select from `chicken_sightings` with joins to `users` and `stores`
  - Default filter: `flagged = true` AND `admin_reviewed = false`
  - Allow toggling to show all submissions or only unreviewed
- Table columns (per PRD):
  - User (name or email)
  - Store (name)
  - Label time (formatted)
  - Observed at (formatted)
  - Flag reason
  - Algorithm suggestion (approve/reject + confidence — placeholder for now, show `algorithm_suggestion` column value)
  - Actions: Approve / Reject buttons
- Sortable by date (most recent first by default)
- Pagination or infinite scroll for large datasets

### 4. Approve / reject server actions
- Location: `lib/actions/admin.ts`
- `approveSighting(id: number)`:
  - Set `admin_reviewed = true`, `admin_approved = true`
  - Approved sightings are included in heatmap calculations
- `rejectSighting(id: number)`:
  - Set `admin_reviewed = true`, `admin_approved = false`
  - Rejected sightings excluded from heatmap but retained in DB
- Both actions:
  - Verify caller is admin
  - Verify sighting exists
  - Return structured result
- Batch actions: "Approve All Visible" / "Reject All Visible" for efficiency

### 5. Submissions query
- Location: `lib/queries/admin.ts`
- Parameterized query:
  - Filter by: flagged status, review status, store, user, date range
  - Sort by: observed_at, label_time, flag_reason
  - Paginate: offset + limit or cursor-based
- Return shape includes joined user name/email and store name

### 6. Filtering and search
- Filter controls above the table:
  - Status filter: "Unreviewed" (default) | "Approved" | "Rejected" | "All"
  - Store filter: dropdown of stores
  - Date range picker
  - User search
- URL-driven filters (search params) so state persists across navigation

## Key Decisions to Research
- Admin role implementation approach (DB column, env allowlist, or Better Auth roles)
- Pagination strategy (offset vs cursor — offset is simpler, cursor is better for real-time data)
- Whether to use Shadcn `DataTable` pattern (with `@tanstack/react-table`) or a simpler custom table
- Real-time updates: should the table auto-refresh? (probably not for MVP — manual refresh is fine)

## Verification
- Admin page only accessible by admin users
- Non-admins see 403 or redirect
- Flagged submissions appear in table with correct data
- Approve action sets correct DB columns, sighting appears in heatmap
- Reject action sets correct DB columns, sighting excluded from heatmap
- Filters narrow results correctly
- Pagination works
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- Write tests for approve/reject server actions

## Output
- `app/admin/layout.tsx`
- `app/admin/submissions/page.tsx`
- `lib/actions/admin.ts`
- `lib/queries/admin.ts`
- Admin role/access control mechanism
- Possibly update `lib/db/schema.ts` if adding `is_admin` column
