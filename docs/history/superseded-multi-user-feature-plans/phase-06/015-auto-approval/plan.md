---
status: pending
---

# 015 — Auto-Approval

## Phase
6 — Future / Stretch

## Goal
Build the algorithmic auto-approval system that can automatically approve or reject submissions based on model confidence, reducing admin burden.

## Prerequisites
- 009-admin-submissions (manual review system)
- 014-trust-score (trust scoring provides input signal)
- Sufficient historical data with admin decisions to train/validate the model

## References
- `docs/PRD.md` lines 189-190 — "validate algorithm over time, eventually flip to auto-approve"
- `docs/PRD.md` line 107 — `algorithm_suggestion` column on `chicken_sightings`

## Scope

### 1. Algorithm design
- Inputs to the approval model:
  - User trust score
  - Timestamp plausibility (within expected distribution for this store/day/time?)
  - GPS proximity
  - Rate of submissions (unusual bursts?)
  - Flag status and reason
- Output: approve/reject recommendation with confidence score (0.0-1.0)
- Store recommendation in `algorithm_suggestion` column

### 2. Phased rollout
- Phase A: algorithm populates `algorithm_suggestion` column, admin still reviews manually
  - This is what the current admin view already supports (column exists)
  - Admin decisions are compared against algorithm to measure accuracy
- Phase B: when algorithm accuracy is high enough (threshold TBD), flip to auto-approve
  - Submissions above confidence threshold auto-approved
  - Below threshold still queued for manual review
  - Admin can override auto-decisions

### 3. Accuracy tracking
- Track: algorithm suggestion vs admin decision for all reviewed submissions
- Dashboard in admin view showing:
  - Accuracy rate over time
  - False positive / false negative rates
  - Confidence calibration

### 4. Configuration
- Admin-configurable:
  - Auto-approval confidence threshold
  - Enable/disable auto-approval per store or globally
  - Override mechanism

## Key Decisions to Research
- ML model vs rule-based heuristics (start with rules, graduate to ML if data warrants)
- Confidence threshold for auto-approval
- How to handle disagreements between algorithm and admin

## Output
- Approval algorithm logic
- Updated sighting submission pipeline
- Admin accuracy dashboard
- Configuration controls
