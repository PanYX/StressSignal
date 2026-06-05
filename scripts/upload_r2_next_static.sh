#!/usr/bin/env bash

set -euo pipefail

log() {
  printf '[%s] %s\n' "$(date +'%Y-%m-%dT%H:%M:%S%z')" "$*"
}

if ! command -v aws >/dev/null 2>&1; then
  log "ERROR: aws cli not found."
  exit 1
fi

export AWS_DEFAULT_REGION=auto

if [[ -z "${R2_ENDPOINT_URL:-}" ]]; then
  log "ERROR: R2_ENDPOINT_URL is required."
  exit 1
fi
if [[ -z "${R2_BUCKET:-}" ]]; then
  log "ERROR: R2_BUCKET is required."
  exit 1
fi
if [[ -z "${NEXT_PUBLIC_ASSET_PREFIX:-}" ]]; then
  log "ERROR: NEXT_PUBLIC_ASSET_PREFIX is required."
  exit 1
fi
if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  log "ERROR: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are required."
  exit 1
fi

R2_ENDPOINT_URL="${R2_ENDPOINT_URL#\"}"
R2_ENDPOINT_URL="${R2_ENDPOINT_URL%\"}"
R2_ENDPOINT_URL="${R2_ENDPOINT_URL#\'}"
R2_ENDPOINT_URL="${R2_ENDPOINT_URL%\'}"
R2_ENDPOINT_URL="${R2_ENDPOINT_URL%/}"

case "$R2_ENDPOINT_URL" in
  https://*.r2.cloudflarestorage.com)
    ;;
  *)
    log "ERROR: R2_ENDPOINT_URL must be the account-level Cloudflare R2 S3 API endpoint, for example https://<account-id>.r2.cloudflarestorage.com. Do not include a bucket name, /fe path, custom domain, quotes, or comma-separated URLs."
    exit 1
    ;;
esac

ORIGINAL_AWS_CONFIG_FILE="${AWS_CONFIG_FILE:-}"
TEMP_AWS_CONFIG_FILE="$(mktemp)"
cat > "$TEMP_AWS_CONFIG_FILE" <<EOF
[default]
region = $AWS_DEFAULT_REGION
s3 =
    addressing_style = path
EOF
export AWS_CONFIG_FILE="$TEMP_AWS_CONFIG_FILE"
trap 'rm -f "$TEMP_AWS_CONFIG_FILE"; export AWS_CONFIG_FILE="$ORIGINAL_AWS_CONFIG_FILE"' EXIT

NEXT_STATIC_DIR=".r2-next-static"
if [[ ! -d "$NEXT_STATIC_DIR" ]]; then
  log "ERROR: missing static directory: $NEXT_STATIC_DIR"
  exit 1
fi

ASSET_PREFIX_URL="${NEXT_PUBLIC_ASSET_PREFIX%/}"
case "$ASSET_PREFIX_URL" in
  http://* | https://*)
    ;;
  *)
    log "ERROR: NEXT_PUBLIC_ASSET_PREFIX must be an absolute URL."
    exit 1
    ;;
esac

ASSET_PREFIX_NO_SCHEME="${ASSET_PREFIX_URL#*://}"
if [[ "$ASSET_PREFIX_NO_SCHEME" != */* ]]; then
  log "ERROR: NEXT_PUBLIC_ASSET_PREFIX must include a path prefix."
  exit 1
fi

R2_PREFIX="${ASSET_PREFIX_NO_SCHEME#*/}"
R2_PREFIX="${R2_PREFIX%%\?*}"
R2_PREFIX="${R2_PREFIX%%\#*}"
R2_PREFIX="${R2_PREFIX#/}"
R2_PREFIX="${R2_PREFIX%/}"

if [[ -z "$R2_PREFIX" ]]; then
  log "ERROR: derived R2 prefix is empty."
  exit 1
fi
if [[ "/$R2_PREFIX/" == *"/_next/"* ]]; then
  log "ERROR: NEXT_PUBLIC_ASSET_PREFIX must not include /_next."
  exit 1
fi

DEST="s3://${R2_BUCKET}/${R2_PREFIX}/_next/static"
CACHE_CONTROL="public, max-age=31536000, immutable"

log "Uploading Next static assets."
log "Source: $NEXT_STATIC_DIR"
log "Destination: $DEST"

aws s3 sync "$NEXT_STATIC_DIR" "$DEST" \
  --endpoint-url "$R2_ENDPOINT_URL" \
  --only-show-errors \
  --no-progress \
  --cache-control "$CACHE_CONTROL"

log "Upload complete."
