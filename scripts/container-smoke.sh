#!/bin/sh

set -eu

IMAGE_TAG="${IMAGE_TAG:-chicken-tracking:smoke}"
NETWORK_NAME="chicken-tracking-smoke-$$"
DATABASE_NAME="chicken-tracking-database-$$"
APP_NAME="chicken-tracking-app-$$"
MIGRATION_NAME="chicken-tracking-migration-$$"
POSTGRES_URL="postgresql://postgres:postgres@${DATABASE_NAME}:5432/chicken_tracking"
APP_DATABASE_URL="postgresql://chicken_tracking:chicken_tracking@${DATABASE_NAME}:5432/chicken_tracking"
MIGRATION_LOCK_KEY="481849106705489314"

cleanup() {
  docker rm --force "$APP_NAME" "$MIGRATION_NAME" "$DATABASE_NAME" >/dev/null 2>&1 || true
  docker network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}

trap cleanup EXIT INT TERM

docker build --tag "$IMAGE_TAG" .
docker network create "$NETWORK_NAME" >/dev/null
docker run --detach --name "$DATABASE_NAME" --network "$NETWORK_NAME" \
  --env POSTGRES_DB=chicken_tracking \
  --env POSTGRES_PASSWORD=postgres \
  --env POSTGRES_USER=postgres \
  postgres:17-alpine >/dev/null

attempt=0
until docker logs "$DATABASE_NAME" 2>&1 \
  | grep --quiet "PostgreSQL init process complete; ready for start up."; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs "$DATABASE_NAME" >&2
    echo "PostgreSQL did not finish initialization." >&2
    exit 1
  fi
  sleep 1
done

attempt=0
until docker exec "$DATABASE_NAME" psql --set ON_ERROR_STOP=1 --username postgres \
  --dbname chicken_tracking --command "SELECT 1" >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs "$DATABASE_NAME" >&2
    echo "PostgreSQL did not become queryable." >&2
    exit 1
  fi
  sleep 1
done

POSTGRES_VERSION="$(docker exec "$DATABASE_NAME" psql --tuples-only --no-align \
  --username postgres --dbname chicken_tracking --command "SHOW server_version")"
echo "PostgreSQL server version: ${POSTGRES_VERSION} (postgres:17-alpine)"

docker exec "$DATABASE_NAME" psql --set ON_ERROR_STOP=1 --username postgres --dbname postgres \
  --command "CREATE ROLE chicken_tracking LOGIN PASSWORD 'chicken_tracking' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT" \
  >/dev/null
docker exec "$DATABASE_NAME" psql --set ON_ERROR_STOP=1 --username postgres --dbname postgres \
  --command "ALTER DATABASE chicken_tracking OWNER TO chicken_tracking" >/dev/null

if docker run --rm "$IMAGE_TAG"; then
  echo "Container unexpectedly served without DATABASE_URL." >&2
  exit 1
fi

if docker run --rm --network "$NETWORK_NAME" \
  --env DATABASE_URL="postgresql://incorrect:incorrect@${DATABASE_NAME}:5432/chicken_tracking" \
  "$IMAGE_TAG"; then
  echo "Container unexpectedly served after a migration connection failure." >&2
  exit 1
fi

# Hold the same advisory lock to prove both a standalone migration and a serving container wait
# before they discover or apply the migration history. The two containers then race normally.
docker exec "$DATABASE_NAME" psql --set ON_ERROR_STOP=1 --username postgres \
  --dbname chicken_tracking --command "SELECT pg_advisory_lock(${MIGRATION_LOCK_KEY}); SELECT pg_sleep(3)" \
  >/dev/null &
LOCK_PROCESS_ID=$!
sleep 1

docker run --detach --name "$MIGRATION_NAME" --network "$NETWORK_NAME" \
  --env DATABASE_URL="$APP_DATABASE_URL" "$IMAGE_TAG" migrate >/dev/null
docker run --detach --name "$APP_NAME" --network "$NETWORK_NAME" \
  --publish 127.0.0.1::3000 --env DATABASE_URL="$APP_DATABASE_URL" "$IMAGE_TAG" >/dev/null

sleep 1
if docker exec "$DATABASE_NAME" psql --tuples-only --no-align --username postgres \
  --dbname chicken_tracking --command "SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL" \
  | grep --quiet true; then
  echo "Migration ran before the advisory lock was released." >&2
  exit 1
fi

wait "$LOCK_PROCESS_ID"

if [ "$(docker wait "$MIGRATION_NAME")" != "0" ]; then
  docker logs "$MIGRATION_NAME" >&2
  echo "Standalone migration failed while starting concurrently with the server." >&2
  exit 1
fi

attempt=0
until curl --fail --silent --show-error "http://127.0.0.1:$(docker port "$APP_NAME" 3000/tcp | sed 's/.*://')/health" \
  | grep --quiet '"status":"ok"'; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    docker logs "$APP_NAME" >&2
    echo "Container did not become healthy." >&2
    exit 1
  fi
  sleep 1
done

APP_HTTP_PORT="$(docker port "$APP_NAME" 3000/tcp | sed 's/.*://')"
curl --fail --silent --show-error "http://127.0.0.1:${APP_HTTP_PORT}/" | grep --quiet "Capture"
curl --fail --silent --show-error "http://127.0.0.1:${APP_HTTP_PORT}/plan" | grep --quiet "Plan"

# Every acceptance journey starts from a fresh database but has a stable historical record. Its
# intentionally old creation instant keeps the journey's new sightings first in Recent Sightings.
docker exec "$DATABASE_NAME" psql --set ON_ERROR_STOP=1 --username postgres \
  --dbname chicken_tracking --command \
  "INSERT INTO sightings (label_date, label_minute, created_at, updated_at) VALUES ('2020-01-01', 600, '2000-01-01T00:00:00Z', '2000-01-01T00:00:00Z')" \
  >/dev/null
node ./scripts/acceptance-journey.mjs "http://127.0.0.1:${APP_HTTP_PORT}"

docker stop "$DATABASE_NAME" >/dev/null
if curl --fail --silent "http://127.0.0.1:${APP_HTTP_PORT}/health"; then
  echo "Health remained ready after PostgreSQL connectivity was removed." >&2
  exit 1
fi

echo "Container smoke check passed."
