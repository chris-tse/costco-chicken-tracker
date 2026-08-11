# 016 — Correct, Delete, and Review Recent Sightings Research

## 2026-08-11

- Issue #16 and parent #12 require recency to depend only on `created_at DESC, id DESC`.
  Backfilled label facts and later corrections therefore cannot move a sighting in Recent
  Sightings.
- The correction contract is deliberately whole-record: label date, minute, and nullable
  doneness travel together. A generic patch contract would weaken the intended invariant and is
  out of scope.
- The existing baseline migration already has the needed descending creation/identity index and
  must not gain speculative history/search indexes.
- A correction or deletion can race with another actor/process. The public operation result must
  represent that as `not-found`, and the UI must present it as a stable state rather than assuming
  the record still exists.
