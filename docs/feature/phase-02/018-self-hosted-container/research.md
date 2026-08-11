# #18 research notes

## 2026-08-11 — issue and implementation constraints

- Issue #18 is unblocked by #16 and #17 and requires a single stateless OCI image against
  operator-provided PostgreSQL.
- Current Drizzle migration folders use the current directory-per-migration layout rather
  than the historical journal format. The migration tool must retain that layout in the
  runtime image.
- Nitro’s production output traces the PostgreSQL runtime dependency but does not contain
  the committed migration files or a standalone migration command. This checkpoint packages
  a small Node migration bundle and `drizzle/` alongside the output.
- The local environment has no Docker daemon/client. Docker build and black-box execution
  therefore belong in GitHub Actions; the script remains runnable on an operator machine
  with Docker available.
