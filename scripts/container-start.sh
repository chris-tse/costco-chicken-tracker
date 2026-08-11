#!/bin/sh

set -eu

case "${1:-serve}" in
  migrate)
    exec bun ./scripts/migrate.mjs
    ;;
  serve)
    bun ./scripts/migrate.mjs
    exec bun ./.output/server/index.mjs
    ;;
  *)
    exec "$@"
    ;;
esac
