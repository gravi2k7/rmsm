#!/usr/bin/env bash
set -euo pipefail

: "${APP_NAME:?APP_NAME must be set}"

ENTRYPOINT_FILE="/workspace/apps/api/dist/main.js"

if [ ! -f "${ENTRYPOINT_FILE}" ]; then
    echo "[start-node] ${ENTRYPOINT_FILE} not found."
    exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"

echo "[start-node] Starting ${APP_NAME}..."

exec node "${ENTRYPOINT_FILE}"