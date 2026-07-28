#!/usr/bin/env bash
# ==============================================================================
# RMSM Docker Platform — docker/scripts/prisma-generate.sh
# ==============================================================================
#
# Reusable wrapper around Prisma client generation.
#
# build.Dockerfile calls this directly (as `docker/scripts/prisma-generate.sh`)
# instead of hardcoding `pnpm --filter @rmsm/database generate` inline, so
# there is exactly one place — this file — that knows which package owns
# the Prisma schema. If that ever changes, or if a second Prisma-owning
# package is ever introduced, this script (not every Dockerfile that needs
# a generated client) is what changes.
#
# Usage:
#   docker/scripts/prisma-generate.sh [package-name]
#
#   package-name   Workspace package that owns schema.prisma.
#                  Defaults to @rmsm/database.
#
# Exit status is whatever `pnpm --filter <package> generate` returns.
# ==============================================================================
set -euo pipefail

PRISMA_PACKAGE="${1:-@rmsm/database}"

echo "[prisma-generate] Generating Prisma client for ${PRISMA_PACKAGE}..."
pnpm --filter "${PRISMA_PACKAGE}" generate
echo "[prisma-generate] Done."
