# 015 — Complete a Sighting with Optional Doneness Research

## 2026-08-11

- #15 preserves Save-then-enrich: a successful initial create is never reclassified as failed
  because optional doneness cannot be saved.
- Doneness is constrained to the canonical lower-case literals `light`, `medium`, and `dark`;
  removing it means a database `NULL`, not a blank string.
- The targeted operation updates only doneness and the application-maintained update instant.
  It deliberately leaves literal label date and minute untouched.
- Completion is intentionally temporary UI state. Reloading after the create can dismiss the
  screen, but cannot lose the already durable sighting. Correction and recent-sightings recovery
  UI arrive in #16.
