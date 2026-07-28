#!/usr/bin/env bash
# ==============================================================================
# RMSM Docker Platform — docker/scripts/start-next.sh
# ==============================================================================
#
# Reusable application startup for every Next.js application on this
# platform (apps/web, apps/admin — any future Next app uses this same
# script by passing a different APP_NAME/APP_PORT). This is the
# ENTRYPOINT of docker/runtime-next.Dockerfile.
#
# Unlike start-node.sh, no ts-node registration is needed here: Next's own
# build (already run once in build.Dockerfile) fully compiles
# apps/<app>/.next into plain JavaScript, and `next start` executes that
# compiled output directly — nothing at runtime needs to load a workspace
# package's raw TypeScript source the way apps/api's ts-node/register does.
#
# Usage (set via Dockerfile ENV, not passed as CLI args):
#   APP_NAME   workspace app directory name under apps/, e.g. "web" or
#              "admin" (required)
#   APP_PORT   port `next start` binds to (defaults to 3000)
# ==============================================================================
set -euo pipefail

: "${APP_NAME:?APP_NAME must be set (e.g. APP_NAME=web)}"
APP_PORT="${APP_PORT:-3000}"

APP_DIR="apps/${APP_NAME}"

if [ ! -d "${APP_DIR}/.next" ]; then
  echo "[start-next] ${APP_DIR}/.next not found. Was ${APP_NAME} built and copied into this image?" >&2
  exit 1
fi

export NODE_ENV="${NODE_ENV:-production}"

echo "[start-next] Starting ${APP_NAME} (NODE_ENV=${NODE_ENV}, port ${APP_PORT})..."
exec node_modules/.bin/next start --prefix "${APP_DIR}" -p "${APP_PORT}"
