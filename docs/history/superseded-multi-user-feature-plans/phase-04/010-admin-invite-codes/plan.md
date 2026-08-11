---
status: pending
---

# 010 — Admin Invite Codes

## Phase
4 — Moderation & Admin

## Goal
Build the admin invite codes tab where admins can generate single-use invite codes, view existing codes with their status, and revoke unused codes.

## Prerequisites
- 001-database-setup (schema with `invite_codes`)
- 002-auth-setup (invite code validation already exists for signup flow)
- 009-admin-submissions (admin layout and role system already established)

## References
- `docs/PRD.md` lines 194-197 — invite codes tab spec
- `docs/PRD.md` lines 82-92 — `invite_codes` schema
- `docs/PRD.md` lines 130-137 — auth flow (invite code signup)

## Scope

### 1. Invite codes page
- Location: `app/admin/invite-codes/page.tsx`
- Under the admin layout from 009 (tab navigation already exists)

### 2. Generate new code
- "Generate Code" button at the top of the page
- Server action: `generateInviteCode()`
  - Generate a cryptographically random code (research: format — UUID, nanoid, short alphanumeric?)
  - Insert into `invite_codes` with `created_by = currentUser.id`
  - Return the generated code
- Display behavior:
  - Code shown once in a modal/dialog after generation
  - Include a "Copy to Clipboard" button (use `navigator.clipboard.writeText`)
  - Warning: "This code will only be shown once"
  - The code is visible in the table afterward, so "shown once" refers to the prominent display — but it remains in the table too
- Research: code format considerations:
  - Short enough to share easily (8-12 chars?)
  - Alphanumeric, case-insensitive for ease of entry
  - Collision-resistant at expected scale (dozens of codes, not millions)

### 3. Invite codes table
- Table columns (per PRD):
  - Code (masked or full — decide)
  - Created by (admin name/email)
  - Created date
  - Status: "Available" / "Used" / "Revoked"
  - Used by (name/email, if used)
  - Used at (date, if used)
  - Actions: "Revoke" button (only for unused/unrevoked codes)
- Sort: most recent first
- Pagination if needed (unlikely to be many codes in MVP)

### 4. Revoke code server action
- `revokeInviteCode(id: number)`:
  - Set `revoked_at = NOW()`
  - Only allowed if code is unused (`used_by IS NULL`) and not already revoked
  - Verify caller is admin
  - Return structured result
- Revoked codes cannot be used for signup (update the signup validation in 002 to check `revoked_at IS NULL`)

### 5. Invite codes query
- Location: `lib/queries/invite-codes.ts`
- Fetch all invite codes with joined user info (creator, redeemer)
- Sort by `created_at DESC`
- Include computed status field based on `used_by` and `revoked_at`

### 6. Copy-friendly share flow
- After generating a code, provide:
  - The raw code for manual sharing
  - A full signup URL: `{BASE_URL}/sign-up?code={code}` — one-click copy
- This makes it easy for admins to share invite links via text/email

## Key Decisions to Research
- Code format: UUID vs nanoid vs custom alphanumeric
- Whether to show full codes in the table or mask them (e.g., `abc...xyz`)
- Whether to add an expiration mechanism (not in PRD, but might be useful)
- Rate limiting on code generation (prevent accidental mass generation)

## Verification
- Only admins can access the invite codes page
- Generate creates a valid code in the DB
- Copy to clipboard works
- Generated code can be used to sign up (end-to-end with 002)
- Revoke sets `revoked_at`, revoked code cannot be used to sign up
- Table shows correct status for each code
- `bunx tsc --noEmit` passes
- `bun run lint` passes
- Write tests for code generation and revocation logic

## Output
- `app/admin/invite-codes/page.tsx`
- `lib/actions/invite-codes.ts`
- `lib/queries/invite-codes.ts`
- Update signup validation (from 002) to check `revoked_at`
