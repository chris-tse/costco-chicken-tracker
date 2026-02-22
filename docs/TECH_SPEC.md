# Chicken Tracker PRD

## Overview
A web app for tracking and crowdsourcing Costco rotisserie chicken batch timestamps, enabling users to predict the probability of finding a fresh chicken at their local Costco at any given time.

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
- Aggregate cross-store heatmap (future)
- Automated flag resolution (future)

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js (App Router) | Single repo, full stack TypeScript |
| Hosting | Vercel | Free tier, preview envs per PR |
| Database | PlanetScale Postgres | $5/mo instance, branching for dev/prod |
| ORM | Drizzle | Type safe, schema as source of truth |
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
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invite codes
CREATE TABLE invite_codes (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  used_by TEXT REFERENCES users(id),
  used_at TIMESTAMPTZ,
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
  flag_resolved BOOLEAN DEFAULT false,
  approved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Store Data Pipeline

- **Source:** GitHub repo (`stiles/locations`) — pre-scraped Costco locations with lat/lng
- **Sync:** GitHub Action on a `workflow_dispatch` trigger and a quarterly cron schedule
- **Logic:** Upsert on `external_id`, soft-delete removed locations (set `active = false`), preserve FK integrity on `chicken_sightings`

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
- Label time validated:
  - Future timestamps: soft flagged
  - Timestamps > 4 hours old: soft flagged
  - Repeated anomalous submissions per user: soft flagged with escalating flag reason
- Submission marked `approved = false` pending admin review (MVP)

### Heatmap View (Per Store)
- Day of week × time of day grid
- Color intensity = frequency of sightings for that bucket
- Bucket size: 1 hour (queryable at 30 or 15 min granularity later — raw timestamps stored, no migration needed)
- Color scale: min/max relative to current store's data range
- Low confidence indicator on cells with sparse data points
- Empty state if no data exists for store yet
- Tap a cell → Shadcn Popover showing:
  - Total data points for that store
  - Data points for that time bucket
  - Confidence score
  - Bucket size context

### Header / Probability Bar
- Shown above heatmap on the store view
- "Best times today: xx:xx, yy:yy" — top 2-3 highest probability hours for today's day of week
- "Probability of fresh chicken in the next X min: Y%" — rolling window based on user's commute time setting
- Commute window configurable inline (doesn't require going to profile settings)

---

## Admin View
- Simple table of flagged submissions
- Columns: user, store, label time, observed at, flag reason, algorithmic recommendation (approve/reject)
- Manual approve / reject buttons
- Future: flip to algorithmic auto-approval once confidence in the model is established

---

## Data Quality

### Passive Checks (Automatic)
- GPS proximity check — warn if user's location is far from selected store
- Rate limiting — max 6 submissions per user per store per day
- Timestamp validation — future or stale timestamps soft flagged
- Repeated anomalous behavior tracked per user

### Trust Score (Future)
- Per-user score derived from consistency of submissions vs aggregate
- Low trust submissions weighted less in heatmap rather than hard rejected

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
- Aggregate cross-store heatmap
- Trust score / algorithmic auto-approval
- Email signup
- International locations
- Native mobile app
- Push notifications ("fresh chicken spotted near you")
