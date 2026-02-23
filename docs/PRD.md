# CostcoChickenTracker — PRD

## Overview
**CostcoChickenTracker** is a web app for tracking and crowdsourcing Costco rotisserie chicken batch timestamps, surfacing probability heatmaps to help users time their visits for a fresh chicken.

The name is intentionally direct for SEO and virality. If Costco reaches out regarding trademark concerns, a rebrand will be considered at that time.

---

## Goals
- Allow users to log rotisserie chicken label timestamps at their local Costco
- Visualize historical data as a heatmap to identify high-probability windows for fresh chicken
- Crowdsource data across multiple users and locations while maintaining data quality
- Keep infrastructure costs minimal

---

## Non-Goals (V1)
- International Costco locations
- Native mobile app
- Automated flag resolution (future)

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | TanStack Start (Vite-based) | Single repo, full stack TypeScript |
| Hosting | Vercel (or any Node.js host) | Supports Vercel, Netlify, Cloudflare, bare Node.js |
| Database | PlanetScale Postgres | $5/mo instance, branching for dev/prod |
| ORM | Drizzle | Type safe, schema as source of truth |
| DB Driver | pg (node-postgres) | Recommended by Drizzle docs for node-postgres dialect |
| Auth | Better Auth | Self hosted, Google OAuth, Drizzle adapter |
| Viz | Observable Plot | SVG rect heatmap, wrapped in ref component |
| UI | Shadcn | Component primitives |
| Effect | v4 beta | Server-side business logic and data pipeline |

### Effect Integration Notes
Effect is not a hard architectural requirement but is well suited for the following areas. Adopt where it feels natural rather than forcing it throughout.

**Strong candidates:**
- **Store sync GHA pipeline** — sequential parse → validate → diff → upsert workflow is a natural fit for Effect's pipeline model and error handling
- **Sighting submission logic** — GPS validation, rate limit check, timestamp flag logic, and DB write are a clean chain of effectful operations with explicit error types
- **Flag/trust algorithm** — when built out, the multi-step scoring logic benefits from Effect's composability

**Probably overkill:**
- Simple CRUD server actions
- Auth flow (owned by Better Auth)
- Heatmap aggregation query

---

## Database Schema

```sql
-- Stores (pre-populated, synced via GHA)
CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  image TEXT,
  default_store_id INTEGER REFERENCES stores(id),
  commute_minutes INTEGER DEFAULT 15,
  trust_score NUMERIC DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite codes
CREATE TABLE invite_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  created_by TEXT REFERENCES users(id),
  used_by TEXT REFERENCES users(id),
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chicken sightings
CREATE TABLE chicken_sightings (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  store_id INTEGER NOT NULL REFERENCES stores(id),
  label_time TIMESTAMPTZ NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_lat NUMERIC,
  user_lng NUMERIC,
  flagged BOOLEAN DEFAULT false,
  flag_reason TEXT,
  admin_reviewed BOOLEAN DEFAULT false,
  admin_approved BOOLEAN,
  algorithm_suggestion BOOLEAN,
  doneness SMALLINT,         -- nullable, 1-3 scale (see Footnote B)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Store Data Pipeline
- **Source:** GitHub repo (`stiles/locations`) — pre-scraped Costco locations with lat/lng
- **Sync:** GitHub Action on a `workflow_dispatch` trigger and a quarterly cron schedule
- **Logic:** Upsert on `external_id`, soft-delete removed locations (`active = false`), preserve FK integrity on `chicken_sightings`

```yaml
on:
  schedule:
    - cron: '0 0 1 */3 *'
  workflow_dispatch:
```

---

## Auth Flow
- **Provider:** Google OAuth via Better Auth
- **Signup:** Gated behind a single-use invite code
  - User lands on `/sign-up?code=abc123`
  - Code validated before account creation
  - Code marked as used on success
- **Future:** Email/password signup with rate limiting and email verification (Better Auth native)

---

## User Profile Settings
- Default store (auto-suggested via GPS on first login, user confirms)
- Commute time in minutes (used for rolling probability window)

---

## Core Features

### Log a Sighting
- iOS-style wheel picker for hour, minute, AM/PM
- Store auto-detected via GPS, pre-selected if default store is set
- User confirms or overrides store selection
- Default store saved to profile on first confirmed submission
- Label time validated:
  - Future timestamps: hard rejected
  - Timestamps >4 hours old: soft flagged, not rejected
  - Repeated anomalous submissions per user: soft flagged with escalating flag reason (future)
- GPS proximity check — warn if user's location is far from selected store, require confirmation
- Rate limiting — max 6 submissions per user per store per day
- All submissions marked `admin_approved = null` pending admin review (MVP)

### Heatmap View (Per Store)
- Day of week × time of day grid
- Color intensity = frequency of sightings for that bucket
- Bucket size: 1 hour for MVP, queryable at 30 or 15 min granularity later — raw timestamps stored, no migration needed
- Color scale: min/max relative to current store's data range
- Low confidence indicator on cells with sparse data points
- Empty state if no data exists for store yet
- Aggregate view across all stores available as a toggle/tab
- Tap a cell → Shadcn Popover showing:
  - Total data points for that store
  - Data points for that time bucket
  - Confidence score
  - Bucket size context

### Header / Probability Bar
- Shown above heatmap on the store view
- "Best times today: xx:xx, yy:yy" — top 2-3 highest probability hours for today's day of week based on historical data
- "Probability of fresh chicken in the next X min: Y%" — rolling window based on user's commute time setting
- Commute window configurable inline without going to profile settings

---

## Admin View

### Submissions Tab
- Table of flagged submissions
- Columns: user, store, label time, observed at, flag reason, algorithm suggestion (approve/reject + confidence)
- Manual approve / reject buttons
- Approved submissions included in heatmap calculations
- Rejected submissions excluded but retained in DB
- Goal: validate algorithm over time, eventually flip to auto-approve when confidence is high

### Invite Codes Tab
- Generate a new single-use code (displayed once, copyable)
- Table of existing codes showing: code, created by, created date, used/unused status, who redeemed it and when
- Ability to revoke an unused code

---

## Data Quality

### Passive Checks (Automatic)
- GPS proximity check — warn if user's location is far from selected store
- Rate limiting — max 6 submissions per user per store per day
- Timestamp validation — future timestamps hard rejected, stale (>4hrs) soft flagged
- Repeated anomalous behavior tracked per user

### Trust Score (Future)
- Per-user score derived from consistency of submissions vs aggregate
- Low trust submissions weighted less in heatmap rather than hard rejected
- Schema supports it (`trust_score` on `users`), logic deferred

---

## Deployment

| Environment | Details |
|---|---|
| Local | Dev DB branch on PlanetScale |
| Production | Vercel + PlanetScale `main` branch |
| Preview | Vercel preview envs per PR (uses dev DB branch) |

No formal staging environment for now.

---

## Future / Out of Scope
- Aggregate cross-store heatmap beyond the toggle
- Trust score / algorithmic auto-approval
- Email signup
- International locations
- Native mobile app
- Push notifications ("fresh chicken spotted near you")
- Doneness as a quality dimension on the heatmap (see Footnote B)
- Oven timer as a supplementary data point (see Footnote A)

---

## Footnotes

### Footnote A — Oven Timers
Costco rotisserie chicken ovens have digital countdown timers visible to shoppers from the counter. These were considered as a potential data point but excluded from MVP due to high variance between timer completion and actual chicken removal — making them an unreliable signal. Could be revisited in a future release as a supplementary input alongside label timestamps.

### Footnote B — Doneness as a Metric
There is potential value in allowing users to log a subjective "doneness" rating at time of purchase (e.g. a simple 1–3 scale: under-done / ideal / over-done). This could surface patterns around which times or stores tend to produce better quality birds, adding a quality dimension to the freshness heatmap. Excluded from MVP in favor of keeping the log form frictionless, but the schema should not preclude adding it later.

**Schema implication:** A nullable `doneness SMALLINT` column on `chicken_sightings` is already included in the schema above. No further migration will be needed to support this feature when the time comes.
