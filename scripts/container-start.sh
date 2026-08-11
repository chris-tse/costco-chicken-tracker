#!/bin/sh

set -eu

case "${1:-serve}" in
  migrate)
    exec node ./scripts/migrate.mjs
    ;;
  serve)
    node ./scripts/migrate.mjs
    exec node ./.output/server/index.mjs
    ;;
  *)
    exec "$@"
    ;;
esac
