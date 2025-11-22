#!/usr/bin/env bash

# Update environment URLs across all MetaVR apps.
# Usage: ./update-env-to-domain.sh <domain> [backend_host]
#   domain: e.g. metavrai.shop (protocol inferred as https)
#   backend_host: optional host:port for backend base (default: 34.175.87.152:4000)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOMAIN="${1:-}"
BACKEND_HOST="${2:-34.175.87.152:4000}"

if [[ -z "$DOMAIN" ]]; then
  echo "Usage: $0 <domain> [backend_host]"
  exit 1
fi

APP_URL="https://${DOMAIN}"
BACKEND_URL="http://${BACKEND_HOST}"

echo "Updating env files with:"
echo "  Domain URL:  ${APP_URL}"
echo "  Backend URL: ${BACKEND_URL}"

update_file() {
  local file="$1"
  local replacements=("${@:2}")
  [[ -f "$file" ]] || { echo "Skipping missing $file"; return; }
  for repl in "${replacements[@]}"; do
    local key="${repl%%=*}"
    local val="${repl#*=}"
    if grep -q "^${key}=" "$file"; then
      sed -i "s|^${key}=.*|${key}=${val}|" "$file"
    else
      printf '\n%s=%s\n' "$key" "$val" >> "$file"
    fi
  done
  echo "Updated $file"
}

# Dashboard
update_file "$ROOT_DIR/metavr-dashboard/.env" \
  "NEXT_PUBLIC_APP_URL=${APP_URL}" \
  "NEXTAUTH_URL=${APP_URL}" \
  "NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}"

# Backend
update_file "$ROOT_DIR/backend/.env" \
  "DASHBOARD_ORIGIN=${APP_URL},http://34.175.87.152:3001,http://34.175.87.152:3002,http://34.175.87.152:3003"

# Card Matching App
update_file "$ROOT_DIR/apps/card_matching/.env" \
  "NEXT_PUBLIC_DASHBOARD_URL=${APP_URL}" \
  "NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}"

# IQ Questions App
update_file "$ROOT_DIR/apps/iq-questions/.env" \
  "NEXT_PUBLIC_DASHBOARD_URL=${APP_URL}" \
  "NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}"

# AI-npc App
update_file "$ROOT_DIR/apps/AI-npc/.env" \
  "NEXT_PUBLIC_DASHBOARD_URL=${APP_URL}" \
  "NEXT_PUBLIC_BACKEND_URL=${BACKEND_URL}"

echo "Done. Restart services to apply changes."

