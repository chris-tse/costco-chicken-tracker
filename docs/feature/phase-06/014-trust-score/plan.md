---
status: pending
---

# 014 — Trust Score Algorithm

## Phase
6 — Future / Stretch

## Goal
Implement the per-user trust score system that weights sighting submissions based on consistency with aggregate data, reducing the impact of unreliable submissions without hard-rejecting them.

## Prerequisites
- All core features (Phases 1-4)
- Sufficient real data to establish aggregate baselines

## References
- `docs/PRD.md` lines 209-211 — trust score spec
- `docs/PRD.md` line 79 — `trust_score` column on `users` (already in schema)

## Scope

### 1. Trust score model design
- Research and define the scoring algorithm:
  - Inputs: user's historical submissions vs aggregate patterns for the same store/time
  - Consistency metric: how closely does a user's pattern of submissions match the overall crowd?
  - Score range: 0.0 (untrusted) to 1.0+ (highly trusted), default 1.0
  - Decay: does trust decay over time without activity? Or only on anomalous submissions?
- Consider:
  - New users start at 1.0 (neutral)
  - Submissions that align with aggregate increase trust
  - Outlier submissions that get rejected decrease trust
  - Admin overrides (approve/reject) are strongest signal

### 2. Trust-weighted heatmap
- Modify heatmap aggregation query (from 006):
  - Instead of raw count, use `SUM(trust_score)` or weighted count
  - Low-trust submissions still appear but contribute less
- This is the key differentiator from simply rejecting: data is soft-weighted

### 3. Trust score computation job
- Could run as:
  - A periodic batch job (nightly cron GHA)
  - Computed on each new submission
  - Recomputed on admin review actions
- Effect is a strong candidate for this pipeline

### 4. Admin visibility
- Show trust score per user in admin views
- Flag users with low trust scores for manual review

## Key Decisions to Research
- Statistical model for consistency scoring (z-score from aggregate? Bayesian?)
- Batch vs real-time computation
- What threshold of trust should trigger admin alerts
- Whether to expose trust score to the user themselves

## Output
- Trust score computation logic
- Updated heatmap query with trust weighting
- Admin UI updates
- Possibly a GHA for batch recomputation
