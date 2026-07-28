# syntax=docker/dockerfile:1.7
#
# ==============================================================================
# RMSM Docker Platform — runtime-node.Dockerfile
# ==============================================================================
#
# Purpose
# -------
# Minimal production image for any NestJS-style Node API service on this
# platform. Not apps/api-specific: which application it packages is a
# build argument, so this one file serves "API services" (plural, per the
# task brief) — today apps/api, and any future Node service without
# needing a new Dockerfile.
#
# Required build arguments
#   APP_NAME    Directory name under apps/ to package, e.g. "api".
#               No default — a runtime image must always name its app
#               explicitly.
#   APP_PORT    Port the service listens on and the HEALTHCHECK probes.
#               Defaults to 3001 (apps/api's existing port).
#
# Why this isn't built FROM build.Dockerfile's image directly
# ---------------------------------------------------------------
# The build image carries the entire monorepo's source, every
# application's build output, the Turbo cache, and git history — none of
# which belongs in a production container. This Dockerfile starts fresh
# FROM the lean base image and copies across only the specific paths a
# Node runtime actually needs, via a throwaway `artifacts` stage that
# exists only so `COPY --from=` has somewhere to reach into.
#
# Why node_modules AND packages/ are both copied
# ---------------------------------------------------
# Several RMSM workspace packages are intentionally consumed straight
# from their own src/ (see build.Dockerfile's comments) rather than a
# compiled dist/. node_modules/@rmsm/<package> in this workspace is a
# pnpm symlink pointing at packages/<package> — copying node_modules
# without packages/, or the reverse, produces a runtime image with
# dangling symlinks and a service that fails at require()-time, not at
# build time. This mirrors exactly what the existing (untouched)
# apps/api/Dockerfile already does; this file generalizes that proven
# pattern across any Node service instead of duplicating it per app.
#
# Why this image is not pruned to `--prod`-only dependencies
# ---------------------------------------------------------------
# ts-node is a devDependency of apps/api, but start-node.sh (see
# docker/scripts/) genuinely needs it at runtime, in production, to
# resolve those same raw-src workspace packages via `-r ts-node/register`
# — that requirement was established and fixed earlier in this
# repository's history (see apps/api/package.json's own "start" script)
# and this image must stay consistent with it. Excluding devDependencies
# here would silently break every Node runtime image at container start.
# "Minimal" in this Dockerfile means: no build tooling, no Turbo cache, no
# other applications' source, non-root, small OS layer — not an
# aggressively pruned node_modules, which is not safely achievable without
# either changing apps/api's package.json dependencies (out of scope for
# Phase 1) or redesigning how workspace packages are consumed (explicitly
# out of scope). This tradeoff is also called out in compatibility-notes.md.
#
# Build
#   docker build -f docker/runtime-node.Dockerfile \
#     --build-arg BASE_IMAGE=rmsm/base:latest \
#     --build-arg BUILD_IMAGE=rmsm/build:latest \
#     --build-arg APP_NAME=api \
#     --build-arg APP_PORT=3001 \
#     -t rmsm/api:latest .
#
# Run
#   docker run -p 3001:3001 --env-file .env rmsm/api:latest
# ==============================================================================

ARG BASE_IMAGE=rmsm/base:latest
ARG BUILD_IMAGE=rmsm/build:latest

# A named alias for the build image, used only as a COPY source below —
# never run, never given a CMD.
FROM ${BUILD_IMAGE} AS artifacts

FROM ${BASE_IMAGE} AS runtime-node

ARG APP_NAME
ARG APP_PORT=3001
RUN test -n "${APP_NAME}" || (echo "APP_NAME build-arg is required, e.g. --build-arg APP_NAME=api" >&2 && exit 1)

ENV NODE_ENV=production \
    APP_NAME=${APP_NAME} \
    APP_PORT=${APP_PORT}

WORKDIR /workspace

# Root-level files: package.json carries "type": "commonjs" (relevant to
# Node's module resolution for any file that has no nearer package.json)
# and pnpm-workspace.yaml lets packages/config's env loader find the
# monorepo root using the exact same upward-search it uses in
# development, keeping runtime behavior identical across environments.
COPY --from=artifacts /workspace/package.json ./package.json
COPY --from=artifacts /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml

# The full dependency tree and the full packages/ directory — see the
# header comment for why both are required together.
COPY --from=artifacts /workspace/node_modules ./node_modules
COPY --from=artifacts /workspace/packages ./packages

# Only the target application's own build output and manifests — not its
# TypeScript sources, not its tests, not any other application under
# apps/.
COPY --from=artifacts /workspace/apps/${APP_NAME}/dist ./apps/${APP_NAME}/dist
COPY --from=artifacts /workspace/apps/${APP_NAME}/package.json ./apps/${APP_NAME}/package.json
COPY --from=artifacts /workspace/apps/${APP_NAME}/tsconfig.json ./apps/${APP_NAME}/tsconfig.json

# Reusable platform scripts (see docker/scripts/) — copied from the build
# context directly (they are not build artifacts, they're checked-in
# source), not from the artifacts stage.
COPY docker/scripts/start-node.sh /usr/local/bin/start-node.sh
COPY docker/scripts/wait-for.sh /usr/local/bin/wait-for.sh
RUN chmod +x /usr/local/bin/start-node.sh /usr/local/bin/wait-for.sh

EXPOSE ${APP_PORT}

# Every NestJS service on this platform is expected to expose a /health
# endpoint (apps/api already does, via packages/health). wget is provided
# by BusyBox in the node:24-alpine base image, so no extra package is
# needed for this probe.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- "http://127.0.0.1:${APP_PORT}/health" || exit 1

USER rmsm

ENTRYPOINT ["/usr/local/bin/start-node.sh"]
