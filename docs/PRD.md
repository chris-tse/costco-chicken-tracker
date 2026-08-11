# Chicken Tracking — Current Product Specification

The source of truth is [GitHub issue #12](https://github.com/chris-tse/costco-chicken-tracker/issues/12).
This document is the repository-local guide to that resolved specification and
its delivery checkpoints.

The assembled checkpoint is [#19](https://github.com/chris-tse/costco-chicken-tracker/issues/19).
Its [versioned acceptance record](acceptance/2026-08-11-mvp.md) is the handoff status: automated
evidence can be reproduced from the repository, while physical-device and named-browser evidence
must be recorded as a distinct release check and is never inferred from emulation.

## Product

Chicken Tracking is a private, mobile-first application for one person. It
records the date and time printed on a rotisserie chicken label, optionally
records doneness as `light`, `medium`, or `dark`, supports correction of recent
sightings, and helps choose a historically useful weekday and approximate time.

The app has no application identity, accounts, invitations, roles, moderation,
stores, location selection, GPS, synchronization, or cross-store aggregation.
Private-network access is the operator's responsibility.

## Canonical language

- A **sighting** records facts read from a chicken label.
- **Label time** is the printed calendar date and clock minute; it is timezone-free.
- **Doneness** is an optional `light`, `medium`, or `dark` assessment.
- A **Visit plan** chooses a weekday and approximate time.
- A **planner signal** describes historical evidence without presenting a forecast.

The full vocabulary is in [`CONTEXT.md`](../CONTEXT.md).

## Resolved delivery graph

The approved graph has seven sequential, reviewable tickets. Each ticket must be runnable and
green before the next one is treated as ready. #19 reconciles the active documentation and records
the final acceptance evidence; it does not add a history grid or any other excluded feature.

1. [#13 — Prepare the private application shell](https://github.com/chris-tse/costco-chicken-tracker/issues/13)
2. [#14 — Capture and durably save label time](https://github.com/chris-tse/costco-chicken-tracker/issues/14)
3. [#15 — Complete a sighting with optional doneness](https://github.com/chris-tse/costco-chicken-tracker/issues/15)
4. [#16 — Correct, delete, and review recent sightings](https://github.com/chris-tse/costco-chicken-tracker/issues/16)
5. [#17 — Plan a visit from historical sightings](https://github.com/chris-tse/costco-chicken-tracker/issues/17)
6. [#18 — Run the assembled app as a self-hosted container](https://github.com/chris-tse/costco-chicken-tracker/issues/18)
7. [#19 — Complete MVP acceptance and documentation reconciliation](https://github.com/chris-tse/costco-chicken-tracker/issues/19)

## Operating boundary

The completed app will use an operator-provided PostgreSQL database via
`DATABASE_URL`, run as one stateless container, apply committed migrations before
serving, and expose database-aware health. The operator owns PostgreSQL lifecycle,
backups, private access, TLS, and routing.

## Historical material

The former crowdsourced, multi-user, location-aware plans are preserved under
[`docs/history/superseded-multi-user-feature-plans`](history/superseded-multi-user-feature-plans).
They are historical context only and must not guide current implementation.
