#!/usr/bin/env bash

set -euo pipefail

# Colors
RESET="\033[0m"
BOLD="\033[1m"
BLUE="\033[34m"
GREEN="\033[32m"
YELLOW="\033[33m"
RED="\033[31m"

log_section() {
  echo -e "${BOLD}${BLUE}==>${RESET} ${BOLD}$1${RESET}"
}

log_info() {
  echo -e "${BLUE}[INFO]${RESET} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${RESET} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${RESET} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${RESET} $1"
}

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$ROOT_DIR/logs/run-all"
mkdir -p "$LOG_DIR"

SERVICES=(
  "backend:$ROOT_DIR/backend:4000:npm run start:prod"
  "metavr-dashboard:$ROOT_DIR/metavr-dashboard:3000:node .next/standalone/server.js"
  "iq-questions:$ROOT_DIR/apps/iq-questions:3001:npm run start"
  "card_matching:$ROOT_DIR/apps/card_matching:3002:npm run start"
)

declare -a CHILD_PIDS=()

cleanup() {
  if [ ${#CHILD_PIDS[@]} -gt 0 ]; then
    log_section "Stopping services"
    for pid in "${CHILD_PIDS[@]}"; do
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
    done
    wait || true
  fi
}
trap cleanup EXIT

kill_port() {
  local port="$1"
  if lsof -ti tcp:"$port" >/dev/null 2>&1; then
    local pids
    pids="$(lsof -ti tcp:"$port")"
    log_warn "Port $port occupied by PID(s): $pids. Terminating..."
    kill $pids >/dev/null 2>&1 || true
    sleep 1
    if lsof -ti tcp:"$port" >/dev/null 2>&1; then
      pids="$(lsof -ti tcp:"$port")"
      kill -9 $pids >/dev/null 2>&1 || true
    fi
  fi
}

build_service() {
  local name="$1"
  local dir="$2"
  
  log_section "Building $name"
  log_info "Directory: $dir"
  if [ ! -d "$dir" ]; then
    log_error "Directory $dir does not exist"
    return 1
  fi
  
  (
    cd "$dir"
    if [ -f "package.json" ]; then
      log_info "Building $name..."
      if npm run build; then
        # For dashboard, copy static assets to standalone directory
        if [ "$name" = "metavr-dashboard" ] && [ -d ".next/static" ] && [ -d ".next/standalone/.next" ]; then
          log_info "Copying static assets for dashboard..."
          rsync -a --delete .next/static/ .next/standalone/.next/static/ || log_warn "Failed to copy static assets"
        fi
        log_success "$name built successfully"
      else
        log_warn "$name build failed, continuing..."
        return 1
      fi
    fi
  )
}

start_service() {
  local name="$1"
  local dir="$2"
  local port="$3"
  local cmd="$4"
  local log_file="$LOG_DIR/${name}.log"

  kill_port "$port"

  log_section "Starting $name"
  log_info "Port: $port"
  log_info "Directory: $dir"
  log_info "Command: $cmd"
  log_info "Log file: $log_file"
  
  # Build service before starting
  build_service "$name" "$dir"
  
  (
    cd "$dir"
    PORT="$port" NODE_ENV=production $cmd
  ) >>"$log_file" 2>&1 &
  local pid=$!
  CHILD_PIDS+=("$pid")
  sleep 2
  if kill -0 "$pid" 2>/dev/null; then
    log_success "$name running with PID $pid"
  else
    log_error "$name failed to start. Check $log_file for details."
  fi
}

log_section "Launching services in production mode"
for entry in "${SERVICES[@]}"; do
  IFS=":" read -r name dir port cmd <<<"$entry"
  start_service "$name" "$dir" "$port" "$cmd"
done

log_success "All services running. Press Ctrl+C to stop."
log_info "Services are accessible at:"
log_info "  - Dashboard: https://metavrai.shop"
log_info "  - IQ Questions: https://metavrai.shop/iq-questions/"
log_info "  - Card Matching: https://metavrai.shop/card-matching/"
log_info "  - Backend API: https://metavrai.shop/api/health"
wait

