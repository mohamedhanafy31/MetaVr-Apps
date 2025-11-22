#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONT_DIR="$ROOT_DIR/metavr-dashboard"
BACK_DIR="$ROOT_DIR/backend"

echo "🔐 MetaVR Environment Validator"
echo "================================"

errors=0

extract_var() {
  local file=$1
  local key=$2

  if [ ! -f "$file" ]; then
    echo ""
    return
  fi

  grep -E "^${key}=" "$file" | tail -n1 | cut -d '=' -f2-
}

check_secret() {
  local label=$1
  local value=$2

  if [ -z "$value" ]; then
    echo "❌ $label SESSION_SECRET is missing"
    errors=$((errors + 1))
  elif [ ${#value} -lt 32 ]; then
    echo "⚠️  $label SESSION_SECRET is shorter than 32 characters"
  else
    echo "✅ $label SESSION_SECRET present"
  fi
}

BACK_ENV_FILE="$BACK_DIR/.env"
if [ ! -f "$BACK_ENV_FILE" ] && [ -f "$BACK_DIR/.env.local" ]; then
  BACK_ENV_FILE="$BACK_DIR/.env.local"
fi

FRONT_ENV_FILE="$FRONT_DIR/.env.local"

echo ""
echo "Backend environment:"
if [ -f "$BACK_ENV_FILE" ]; then
  echo "  • Using $(basename "$BACK_ENV_FILE")"
  back_secret=$(extract_var "$BACK_ENV_FILE" "SESSION_SECRET")
  check_secret "Backend" "$back_secret"

  private_key=$(extract_var "$BACK_ENV_FILE" "SESSION_PRIVATE_KEY")
  public_key=$(extract_var "$BACK_ENV_FILE" "SESSION_PUBLIC_KEY")

  if [ -n "$private_key" ] || [ -n "$public_key" ]; then
    if [ -n "$private_key" ] && [ -n "$public_key" ]; then
      echo "✅ Backend keypair detected (RS256 enabled)"
    else
      echo "⚠️  Provide both SESSION_PRIVATE_KEY and SESSION_PUBLIC_KEY for RS256"
    fi
  else
    echo "ℹ️  Backend will use symmetric HS256 signing"
  fi
else
  echo "❌ No backend .env file found (expected $BACK_DIR/.env or .env.local)"
  errors=$((errors + 1))
fi

echo ""
echo "Frontend environment:"
if [ -f "$FRONT_ENV_FILE" ]; then
  echo "  • Using $(basename "$FRONT_ENV_FILE")"
  front_secret=$(extract_var "$FRONT_ENV_FILE" "SESSION_SECRET")
  check_secret "Frontend" "$front_secret"

  front_public=$(extract_var "$FRONT_ENV_FILE" "SESSION_PUBLIC_KEY")
  if [ -n "$front_public" ]; then
    echo "✅ Frontend SESSION_PUBLIC_KEY configured"
  else
    echo "⚠️  Frontend SESSION_PUBLIC_KEY missing - RS256 verification disabled"
  fi
else
  echo "❌ No frontend .env.local file found"
  errors=$((errors + 1))
fi

echo ""
if [ -x "$FRONT_DIR/scripts/validate-env.sh" ]; then
  echo "Running dashboard validator..."
  (cd "$FRONT_DIR" && ./scripts/validate-env.sh) || errors=$((errors + 1))
else
  echo "⚠️  Dashboard validator script not found"
fi

if [ $errors -eq 0 ]; then
  echo ""
  echo "🎉 Environment looks good!"
else
  echo ""
  echo "❌ Found $errors blocking issue(s). Please address before deploying."
fi

exit $errors

