# 017 — Plan a Visit from Historical Sightings Research

## 2026-08-11

- #17 uses literal label dates, not instants or converted timestamps. PostgreSQL filters its
  `date` column by `extract(dow from label_date)`, and returns `DISTINCT` date/minute pairs in
  ascending date/minute order for deterministic application-side planning.
- The planner score is a count of distinct historical label dates with an observation in the
  selected inclusive ±10-minute window. Window bounds clamp at midnight; they never wrap.
- Candidate centers are each distinct observed minute. Their overlapping windows remain
  independent comparison points, while duplicate source rows and duplicate minutes collapse.
- The planner reports a historical comparison, not a probability or forecast. A database
  failure has no valid evidence count and remains visibly separate from valid empty states.
