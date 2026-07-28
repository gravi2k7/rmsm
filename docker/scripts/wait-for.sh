#!/usr/bin/env bash
# ==============================================================================
# RMSM Docker Platform — docker/scripts/wait-for.sh
# ==============================================================================
#
# Reusable, dependency-free TCP readiness wait. Blocks until a host:port
# accepts a TCP connection (or a timeout elapses), then optionally execs
# into a following command. Used identically for Postgres and Redis (or
# any future dependency) — no netcat, no extra package, just bash's own
# /dev/tcp pseudo-device, which base.Dockerfile's bash install already
# guarantees is available in every image built on this platform.
#
# Usage:
#   docker/scripts/wait-for.sh <host>:<port> [-t timeout_seconds] [-- command args...]
#
# Examples:
#   docker/scripts/wait-for.sh postgres:5432 -t 30
#   docker/scripts/wait-for.sh postgres:5432 -t 30 -- node -r ts-node/register apps/api/dist/main.js
#
# This script is intentionally NOT wired into any Dockerfile's CMD in
# Phase 1 (the task brief is explicit that docker-compose.yml and
# docker-compose.prod.yml are not to be touched this phase). It is
# provided now, as one of the three required reusable script categories,
# so Phase 2's compose migration can call it directly instead of each
# service reinventing its own wait logic.
# ==============================================================================
set -euo pipefail

TIMEOUT=15
TARGET=""
COMMAND=()

usage() {
  echo "Usage: $0 <host>:<port> [-t timeout_seconds] [-- command args...]" >&2
  exit 2
}

if [ "$#" -eq 0 ]; then
  usage
fi

TARGET="$1"
shift

while [ "$#" -gt 0 ]; do
  case "$1" in
    -t)
      TIMEOUT="${2:?-t requires a value}"
      shift 2
      ;;
    --)
      shift
      COMMAND=("$@")
      break
      ;;
    *)
      usage
      ;;
  esac
done

HOST="${TARGET%%:*}"
PORT="${TARGET##*:}"

if [ -z "${HOST}" ] || [ -z "${PORT}" ] || [ "${HOST}" = "${TARGET}" ]; then
  echo "[wait-for] Invalid target '${TARGET}', expected host:port" >&2
  exit 2
fi

echo "[wait-for] Waiting up to ${TIMEOUT}s for ${HOST}:${PORT}..."

elapsed=0
until (exec 3<>"/dev/tcp/${HOST}/${PORT}") 2>/dev/null; do
  elapsed=$((elapsed + 1))
  if [ "${elapsed}" -ge "${TIMEOUT}" ]; then
    echo "[wait-for] Timed out after ${TIMEOUT}s waiting for ${HOST}:${PORT}" >&2
    exit 1
  fi
  sleep 1
done
exec 3>&- 3<&- 2>/dev/null || true

echo "[wait-for] ${HOST}:${PORT} is accepting connections."

if [ "${#COMMAND[@]}" -gt 0 ]; then
  exec "${COMMAND[@]}"
fi
