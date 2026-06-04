#!/usr/bin/env bash

set -euo pipefail

log_info() {
  printf '[INFO] %s\n' "$1"
}

log_error() {
  printf '[ERROR] %s\n' "$1" >&2
}

if [[ -z "${NEXT_IMAGE:-}" ]]; then
  log_error "NEXT_IMAGE is required."
  exit 1
fi

if [[ -z "${GH_USER:-}" || -z "${GH_PAT:-}" ]]; then
  log_error "GH_USER and GH_PAT are required for GHCR login."
  exit 1
fi

if [[ -z "${NEXT_PUBLIC_SITE_URL:-}" ]]; then
  log_error "NEXT_PUBLIC_SITE_URL is required."
  exit 1
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  log_error "DATABASE_URL is required."
  exit 1
fi

if [[ -z "${CRON_SECRET:-}" ]]; then
  log_error "CRON_SECRET is required."
  exit 1
fi

ENVIRONMENT="${ENV:-production}"

case "$ENVIRONMENT" in
  staging | production)
    ;;
  *)
    log_error "ENV must be staging or production."
    exit 1
    ;;
esac

COMPOSE_FILES="-f docker-compose.yml"
if [[ "$ENVIRONMENT" == "staging" ]]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.staging.yml"
else
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.production.yml"
fi

log_info "Deploying StressSignal."
log_info "Environment: $ENVIRONMENT"
log_info "Image: $NEXT_IMAGE"

log_info "Logging in to GHCR."
printf '%s' "$GH_PAT" | docker login ghcr.io -u "$GH_USER" --password-stdin

log_info "Pulling image before touching the running service."
if ! docker pull "$NEXT_IMAGE"; then
  log_error "Image pull failed. Deployment cancelled."
  exit 1
fi

log_info "Stopping current containers."
docker compose $COMPOSE_FILES down --remove-orphans || true

log_info "Starting containers."
export NEXT_IMAGE
export ENV="$ENVIRONMENT"
docker compose $COMPOSE_FILES up -d --force-recreate

log_info "Waiting for application startup."
sleep 10

RUNNING_CONTAINER="$(docker compose $COMPOSE_FILES ps --format '{{.Name}}' | head -n 1)"
if [[ -z "$RUNNING_CONTAINER" ]]; then
  log_error "No running container found."
  docker compose $COMPOSE_FILES logs --tail 50
  exit 1
fi

if ! docker ps --filter "name=$RUNNING_CONTAINER" --filter "status=running" | grep -q "$RUNNING_CONTAINER"; then
  log_error "Container is not running: $RUNNING_CONTAINER"
  docker compose $COMPOSE_FILES logs --tail 50
  exit 1
fi

log_info "Running health check."
HEALTH_CHECK_RETRIES=6
for attempt in $(seq 1 "$HEALTH_CHECK_RETRIES"); do
  if docker exec "$RUNNING_CONTAINER" sh -c 'curl -f http://localhost:3000 >/dev/null'; then
    log_info "Health check passed."
    break
  fi

  if [[ "$attempt" == "$HEALTH_CHECK_RETRIES" ]]; then
    log_error "Health check failed."
    docker compose $COMPOSE_FILES logs --tail 50
    exit 1
  fi

  log_info "Waiting for app readiness ($attempt/$HEALTH_CHECK_RETRIES)."
  sleep 5
done

log_info "Pruning unused images."
docker image prune -f || true

log_info "Deployment complete."
docker compose $COMPOSE_FILES ps
