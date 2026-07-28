# syntax=docker/dockerfile:1.7
#
# ==============================================================================
# RMSM Docker Platform — runtime-next.Dockerfile
# ==============================================================================
#
# Purpose
# -------
# Minimal production image for any Next.js application on this platform.
# Not apps/web-specific: which application it packages is a build
# argument, so this one file serves "Web/Admin" (per the task brief) —
# apps/web and apps/admin today, and any future Next app without a new
# Dockerfile.
#
# Required build arguments
#   APP_NAME    Directory name under apps/ to package, e.g. "web" or
#               "admin". No default.
#   APP_PORT    Port `next start` binds to and the HEALTHCHECK probes.
#               Defaults to 3000 (apps/web's existing port; pass 3002 for
#               apps/admin).
#
# Why this doesn't rely on Next's `output: "standalone"` mode
# ----------------------------------------------------------------
# Next's standalone output mode produces a fully self-contained server
# bundle with a pruned node_modules baked in, which is normally the
# leanest way to run a Next app in Docker. apps/web and apps/admin do not
# have that mode enabled in next.config.mjs, and enabling it is out of
# scope for this refactor ("Do NOT change... folder structure outside
# Docker" — next.config.mjs lives outside docker/, and application
# configuration is explicitly not something Phase 1 touches). This image
# instead runs `next start` directly against the full `.next` build
# output and a real node_modules, exactly the way the existing (untouched)
# apps/web/Dockerfile and apps/admin/Dockerfile already do — this file
# generalizes that proven approach across every Next app instead of
# duplicating it per app. Adopting `output: "standalone"` is a legitimate
# follow-up once an application owner opts into the next.config.mjs
# change; see docker/README.md's compatibility notes.
#
# Why packages/ is NOT copied here (unlike runtime-node.Dockerfile)
# ----------------------------------------------------------------------
# apps/web and apps/admin both declare `transpilePackages: ["@rmsm/ui",
# "@rmsm/shared", "@rmsm/types"]` in next.config.mjs. That setting tells
# Next's own bundler to compile those three workspace packages directly
# into the `.next` build output at build time — by the time build.Dockerfile
# finishes, nothing in .next needs to resolve packages/@rmsm/ui, etc. as a
# separate runtime symlink target the way apps/api's raw-src packages do.
# This matches what the existing web/admin Dockerfiles already ship
# (node_modules + .next + public + manifests, no packages/) — this file
# does not change that behavior, only generalizes it.
#
# Build
#   docker build -f docker/runtime-next.Dockerfile \
#     --build-arg BASE_IMAGE=rmsm/base:latest \
#     --build-arg BUILD_IMAGE=rmsm/build:latest \
#     --build-arg APP_NAME=web \
#     --build-arg APP_PORT=3000 \
#     -t rmsm/web:latest .
#
# Run
#   docker run -p 3000:3000 --env-file .env rmsm/web:latest
# ==============================================================================

ARG BASE_IMAGE=rmsm/base:latest
ARG BUILD_IMAGE=rmsm/build:latest

FROM ${BUILD_IMAGE} AS artifacts

FROM ${BASE_IMAGE} AS runtime-next

ARG APP_NAME
ARG APP_PORT=3000
RUN test -n "${APP_NAME}" || (echo "APP_NAME build-arg is required, e.g. --build-arg APP_NAME=web" >&2 && exit 1)

ENV NODE_ENV=production \
    APP_NAME=${APP_NAME} \
    APP_PORT=${APP_PORT}

WORKDIR /workspace

COPY --from=artifacts /workspace/package.json ./package.json
COPY --from=artifacts /workspace/node_modules ./node_modules

COPY --from=artifacts /workspace/apps/${APP_NAME}/.next ./apps/${APP_NAME}/.next
COPY --from=artifacts /workspace/apps/${APP_NAME}/public ./apps/${APP_NAME}/public
COPY --from=artifacts /workspace/apps/${APP_NAME}/package.json ./apps/${APP_NAME}/package.json
COPY --from=artifacts /workspace/apps/${APP_NAME}/next.config.mjs ./apps/${APP_NAME}/next.config.mjs

COPY docker/scripts/start-next.sh /usr/local/bin/start-next.sh
RUN chmod +x /usr/local/bin/start-next.sh

EXPOSE ${APP_PORT}

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O- "http://127.0.0.1:${APP_PORT}" || exit 1

USER rmsm

ENTRYPOINT ["/usr/local/bin/start-next.sh"]
