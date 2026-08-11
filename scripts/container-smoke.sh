#!/bin/sh

set -eu

IMAGE_TAG="${IMAGE_TAG:-chicken-tracking:smoke}"
NETWORK_NAME="chicken-tracking-smoke-$$"
DATABASE_NAME="chicken-tracking-database-$$"
APP_NAME="chicken-tracking-app-$$"
POSTGRES_URL="postgresql://postgres:postgres@${DATABASE_NAME}:5432/chicken_tracking"

cleanup() {
  docker rm --force "$APP_NAME" "$DATABASE_NAME" >/dev/null 2>&1 || true
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
until docker exec "$DATABASE_NAME" pg_isready -U postgres -d chicken_tracking >/dev/null; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "PostgreSQL did not become ready." >&2
    exit 1
  fi
  sleep 1
done

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

docker run --rm --network "$NETWORK_NAME" --env DATABASE_URL="$POSTGRES_URL" \
  "$IMAGE_TAG" migrate

docker run --detach --name "$APP_NAME" --network "$NETWORK_NAME" \
  --publish 127.0.0.1::3000 --env DATABASE_URL="$POSTGRES_URL" "$IMAGE_TAG" >/dev/null

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
node ./scripts/assembled-smoke.mjs "http://127.0.0.1:${APP_HTTP_PORT}"

docker stop "$DATABASE_NAME" >/dev/null
if curl --fail --silent "http://127.0.0.1:${APP_HTTP_PORT}/health"; then
  echo "Health remained ready after PostgreSQL connectivity was removed." >&2
  exit 1
fi

echo "Container smoke check passed."
