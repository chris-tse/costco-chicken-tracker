# 014 — Capture and Durably Save Label Time Research

## 2026-08-11

- #14 establishes the fresh `sightings` persistence baseline deferred by #13. It intentionally
  has no user, location, timezone, offset, seconds, soft-delete, or concurrency-version data.
- Label date and label minute are literal facts. The UI gets defaults from the browser device
  clock; persistence stores the date text and minute-after-midnight without conversion.
- The first success confirmation remains within Capture. The focused completion and optional
  doneness flow are the next checkpoint (#15), so this checkpoint does not add completion,
  correction, recency, navigation, or planner behavior.
