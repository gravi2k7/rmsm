# syntax=docker/dockerfile:1.7
#
# ==============================================================================
# RMSM API — apps/api/Dockerfile
# Phase 2.2: fully self-contained multi-stage build — zero external pulls
# ==============================================================================
#
# ROOT CAUSE THIS FILE FIXES
# ---------------------------
# The Phase 2 version of this file referenced the shared platform's
# images by tag (`ARG DEPS_IMAGE=rmsm/deps:latest`, `FROM ${DEPS_IMAGE}`),
# bridged into existence via Docker Compose `additional_contexts:
# service:X` entries pointing at internal helper services
# (docker-platform-base/deps/build) added to docker-compose.yml /
# docker-compose.prod.yml. On integration testing, `docker compose -f
# infra/docker/docker-compose.yml build api` failed with:
#
#   failed to solve: load metadata for docker.io/rmsm/deps:latest:
#   pull access denied ... FROM ${DEPS_IMAGE}
#
# i.e. Compose fell through to treating `rmsm/deps:latest` as a literal
# registry reference instead of resolving it against the
# `docker-platform-deps` helper service — that helper service carried a
# `profiles:` entry (deliberately, so `docker compose up` would never try
# to start it as a long-running container), and Compose's default build
# graph resolution does not reliably pull in profiled-off services as
# implicit `additional_contexts` dependencies. The mechanism was fragile
# by construction: it depended on a specific Compose version's handling
# of a relatively new feature (`additional_contexts: service:X`) combined
# with `profiles`, and broke under real testing.
#
# THE FIX
# --------
# This file no longer references any image by tag anywhere. Every stage
# below is either the first stage (`FROM node:24-alpine`, a public,
# always-resolvable base image — not an RMSM-owned tag) or `FROM
# <same-file-stage-name>` — Docker's native multi-stage build mechanism,
# which is resolved 100% locally from this file's own stage graph and
# can *never* attempt a registry pull, in any Docker version, with any
# Compose version, on any machine, regardless of BuildKit driver. There
# is no feature-version dependency left to break.
#
# The base/deps/build stage logic below is intentionally the same
# logic as docker/base.Dockerfile, docker/deps.Dockerfile, and
# docker/build.Dockerfile (same commands, same automatic-workspace-
# discovery mechanism via `pnpm fetch` against the lockfile alone, same
# `pnpm turbo run build`) — those three files are unchanged and remain
# the platform's canonical, standalone-buildable reference
# implementations (useful for a future registry-publishing CI pipeline,
# or as the template for migrating apps/web/apps/admin the same way).
# They are inlined here, not referenced, because inlining is the only
# mechanism Docker itself guarantees will never try to pull an image —
# see docker/PHASE2.2_BUILD_DEPENDENCY_FIX.md for the full explanation
# of why every cross-file alternative was rejected.
#
# RESULT: `docker compose -f infra/docker/docker-compose.yml build api`
# (or `up`, or `up api`, or a plain `docker build -f apps/api/Dockerfile
# --target production .`) now succeeds on a clean machine with no prior
# `docker build`, `docker tag`, `docker bake`, or registry access of any
# kind for any RMSM-owned image.
# ==============================================================================

# ------------------------------------------------------------------------
# base — identical in content to docker/base.Dockerfile: Node 24,
# Corepack (pnpm version resolved from the workspace root's own
# "packageManager" field — never pinned here), OS tooling Prisma/scripts
# need, a non-root user. Nothing application-specific.
# ------------------------------------------------------------------------
FROM node:24-alpine AS base

RUN apk add --no-cache \
      openssl \
      ca-certificates \
      git \
      bash \
      libc6-compat \
    && rm -rf /var/cache/apk/*

RUN corepack enable

RUN addgroup -g 1001 -S rmsm \
    && adduser -u 1001 -S rmsm -G rmsm -h /workspace -s /bin/bash

WORKDIR /workspace

# ------------------------------------------------------------------------
# deps — identical in content to docker/deps.Dockerfile: `pnpm fetch`
# populates the shared pnpm store from pnpm-lock.yaml alone. No
# workspace package.json is read or listed, so this stage automatically
# supports every current and future workspace package with zero edits.
# ------------------------------------------------------------------------
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch

# ------------------------------------------------------------------------
# dev — used by ../../infra/docker/docker-compose.yml (target: dev). The
# full repository is bind-mounted over this at compose runtime; the COPY
# below only matters for a standalone `docker build --target dev`.
# Completes linking from the store `deps` already populated — this is
# what fixes "Cannot find module @rmsm/core" for local dev, the same as
# it does for production below.
# ------------------------------------------------------------------------
FROM deps AS dev

COPY . .

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Prisma's client is generated on every container start (not baked into
# the image) because dev mode bind-mounts the host's schema.prisma
# directly — a schema edit on the host should be picked up on container
# restart without an image rebuild.
CMD ["sh", "-c", "pnpm --filter @rmsm/database generate && pnpm --filter @rmsm/api dev"]

# ------------------------------------------------------------------------
# build — identical in content to docker/build.Dockerfile: complete
# workspace linking, one Prisma generation, one Turbo build for the
# whole workspace (using Turbo's own dependency graph, not a hand
# maintained order). Building the whole workspace here (not just
# @rmsm/api) is deliberate — see docker/README.md's "why one shared
# build" note; apps/web/apps/admin's own build output is simply unused
# by this file's `production` stage below.
# ------------------------------------------------------------------------
FROM deps AS build

COPY . .

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

RUN pnpm --filter @rmsm/database generate

RUN --mount=type=cache,id=rmsm-turbo-cache,target=/workspace/.turbo \
    pnpm turbo run build

# ------------------------------------------------------------------------
# production — used by ../../infra/docker/docker-compose.prod.yml
# (target: production). Minimal runtime: starts fresh from `base` (no
# build tooling residue, no Turbo cache, no other applications' source,
# no .git) and copies across only what @rmsm/api needs to run. Never
# copies the whole repository. Mirrors docker/runtime-node.Dockerfile's
# COPY set exactly, hardcoded to APP_NAME=api since this file's identity
# *is* the API service.
# ------------------------------------------------------------------------
FROM base AS production

ENV NODE_ENV=production \
    APP_NAME=api \
    APP_PORT=3001

WORKDIR /workspace

COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/tsconfig.json ./apps/api/tsconfig.json

# The same reusable entrypoint docker/runtime-node.Dockerfile uses,
# copied from the platform's checked-in scripts. Runs
# `node -r ts-node/register apps/api/dist/main.js` — required because
# several workspace packages are consumed straight from their own
# src/*.ts at runtime (see docker/README.md's compatibility notes).
COPY docker/scripts/start-node.sh /usr/local/bin/start-node.sh
RUN chmod +x /usr/local/bin/start-node.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

USER rmsm

ENTRYPOINT ["/usr/local/bin/start-node.sh"]
