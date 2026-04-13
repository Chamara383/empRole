#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd docker

echo "Starting services..."
docker compose -f "$ROOT_DIR/docker-compose.yml" up -d --build api-gateway auth-service workforce-service finance-service ml-service

cleanup() {
  echo "Stopping services..."
  docker compose -f "$ROOT_DIR/docker-compose.yml" down >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait_for_health() {
  local name="$1"
  local url="$2"
  local max_attempts=30
  local attempt=1

  while [[ $attempt -le $max_attempts ]]; do
    if curl -sS "$url" >/dev/null 2>&1; then
      echo "Healthy: $name"
      return 0
    fi
    sleep 2
    attempt=$((attempt + 1))
  done

  echo "Health check timeout for: $name"
  return 1
}

wait_for_health "gateway" "http://localhost:5002/api/health"
wait_for_health "auth" "http://localhost:5003/api/health"
wait_for_health "workforce" "http://localhost:5004/api/health"
wait_for_health "finance" "http://localhost:5005/api/health"
wait_for_health "ml" "http://localhost:8000/api/health"

assert_status() {
  local name="$1"
  local url="$2"
  local expected="$3"

  local status
  status=$(curl -sS -o /tmp/emprole-smoke-response.json -w "%{http_code}" "$url")

  if [[ "$status" != "$expected" ]]; then
    echo "FAILED: $name expected $expected got $status"
    cat /tmp/emprole-smoke-response.json || true
    exit 1
  fi

  echo "PASS: $name ($status)"
}

assert_status "gateway health" "http://localhost:5002/api/health" "200"
assert_status "auth protected route" "http://localhost:5002/api/auth/me" "401"
assert_status "workforce protected route" "http://localhost:5002/api/employees" "401"
assert_status "finance protected route" "http://localhost:5002/api/expenses" "401"
assert_status "ml health via gateway" "http://localhost:5002/api/attrition/health" "200"

echo "All gateway smoke tests passed."
