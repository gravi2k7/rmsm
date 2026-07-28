#!/usr/bin/env bash
# ==============================================================================
# RMSM Docker Platform — docker/scripts/start-node.sh
# ==============================================================================
#
# Reusable application startup for every NestJS-style Node service on this
# platform (currently apps/api; any future Node API service uses this same
# script by passing a different APP_NAME). This is the ENTRYPOINT of
# docker/runtime-node.Dockerfile.
#
# Why `node -r ts-node/register`, not plain `node dist/main.js`
# ----------------------------------------------------------------
# Several RMSM workspace packages are intentionally consumed straight from
# their own `src/*.ts` (no build step for those packages — see
# build.Dockerfile's comments), so `dist/main.js` still `require()`s raw
# TypeScript at runtime. Node's own module resolver cannot execute that
# directly; the fix already applied to apps/api/package.json's own "start"
# script (`node -r ts-node/register dist/main.js`) is what makes this work
# in this repository today, and this script reproduces that exact
# invocation generically so runtime-node.Dockerfile never hardcodes an
# application name. Bypassing that registration here would silently
# reintroduce ERR_UNSUPPORTED_DIR_IMPORT in production.
#
# TS_NODE_PROJECT is set explicitly (rather than relying on ts-node's
# default upward search from the process's current working directory)
# because this script runs with WORKDIR /workspace, not
# apps/<app>/ — without an explicit project path, ts-node would search
# for a tsconfig.json starting at /workspace and never find
# apps/<app>/tsconfig.json at all.
#
# Usage (set via Dockerfile ENV, not passed as CLI args):
#   APP_NAME   workspace app directory name under apps/, e.g. "api"
#              (required)
#
# Exec's into `node` as PID 1's replacement so the process receives
# signals (SIGTERM on `docker stop` / Kubernetes pod termination)
# directly, instead of being a child of a shell that swallows them.
# ==============================================================================
set -euo pipefail

: "${APP_NAME:?APP_NAME must be set (e.g. APP_NAME=api)}"

APP_DIR="apps/${APP_NAME}"
ENTRYPOINT_FILE="${APP_DIR}/dist/main.js"

if [ ! -f "${ENTRYPOINT_FILE}" ]; then
  echo "[start-node] ${ENTRYPOINT_FILE} not found. Was ${APP_NAME} built and copied into this image?" >&2
  exit 1
fi

export TS_NODE_PROJECT="${APP_DIR}/tsconfig.json"
export NODE_ENV="${NODE_ENV:-production}"

echo "[start-node] Starting ${APP_NAME} (NODE_ENV=${NODE_ENV}, port ${APP_PORT:-unset})..."
exec node -r ts-node/register "${ENTRYPOINT_FILE}"
