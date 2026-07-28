# syntax=docker/dockerfile:1.7
#
# ==============================================================================
# RMSM API — apps/api/Dockerfile
# Phase 2: thin wrapper over the shared RMSM Docker platform (docker/)
# ==============================================================================
#
# This file used to install dependencies and build @rmsm/api entirely on
# its own, using a hand-maintained list of package.json paths:
#
#   COPY apps/api/package.json apps/api/package.json
#   COPY packages/config/package.json packages/config/package.json
#   COPY packages/database/package.json packages/database/package.json
#   COPY packages/shared/package.json packages/shared/package.json
#   COPY packages/types/package.json packages/types/package.json
#   RUN pnpm install --frozen-lockfile --filter @rmsm/api...
#
# That list was already missing @rmsm/core, @rmsm/market, @rmsm/opportunity,
# @rmsm/strategy, @rmsm/execution, @rmsm/decision, and @rmsm/portfolio —
# every one of them an actual @rmsm/api dependency — which is exactly the
# "Cannot find module @rmsm/core" class of failure this migration removes.
# The old, superseded version of this file is preserved for reference at
# apps/api/Dockerfile.OLD_PHASE1_BACKUP (not read by Docker or Compose;
# safe to delete once this migration is validated).
#
# This file now contains ZERO dependency-install or build logic of its
# own. Every stage below is either:
#   (a) FROM an already-built shared platform image
#       (docker/base.Dockerfile, docker/deps.Dockerfile,
#        docker/build.Dockerfile — see "Build order" in
#        docker/README.md and the note directly below), or
#   (b) a minimal COPY of only the specific artifacts @rmsm/api's
#       runtime needs, out of that shared image.
#
# PREREQUISITE — read before running `docker build` or
# `docker compose build` / `docker compose up` against this file
# ------------------------------------------------------------------
# Because this file reuses the shared platform by FROM-referencing its
# already-built images (rather than re-implementing pnpm install / turbo
# build here), those images must exist locally first:
#
#   docker build -f docker/base.Dockerfile  -t rmsm/base:latest  .
#   docker build -f docker/deps.Dockerfile  -t rmsm/deps:latest  --build-arg BASE_IMAGE=rmsm/base:latest .
#   docker build -f docker/build.Dockerfile -t rmsm/build:latest --build-arg DEPS_IMAGE=rmsm/deps:latest .
#
# or, equivalently, one command:
#
#   docker buildx bake -f docker/docker-bake.hcl base deps build
#
# This is not a new limitation introduced here — it is the exact
# prerequisite docker/README.md's "Build order" section already
# documents for every consumer of the shared platform; apps/api is simply
# the first one to actually depend on it. Once built, these three images
# are reused as-is by every subsequent `docker build`/`docker compose
# build` invocation (including web/admin's own images, unaffected by this
# migration) until the lockfile or source changes, per docker/README.md's
# cache strategy.
#
# Build (after the prerequisite above)
#   docker build -f apps/api/Dockerfile --target production \
#     --build-arg BASE_IMAGE=rmsm/base:latest \
#     --build-arg DEPS_IMAGE=rmsm/deps:latest \
#     --build-arg BUILD_IMAGE=rmsm/build:latest \
#     -t rmsm/api:latest .
# ==============================================================================

ARG BASE_IMAGE=rmsm/base:latest
ARG DEPS_IMAGE=rmsm/deps:latest
ARG BUILD_IMAGE=rmsm/build:latest

# ------------------------------------------------------------------------
# dev — local development, used by ../../infra/docker/docker-compose.yml
# (target: dev). The full repository is bind-mounted over this at compose
# runtime; the COPY below only matters for a standalone `docker build
# --target dev` (e.g. in CI, to sanity-check the dev image builds).
#
# Reuses docker/deps.Dockerfile's already-fetched pnpm store (via
# DEPS_IMAGE) instead of re-fetching dependencies, then completes linking
# exactly the way docker/build.Dockerfile does — this is what fixes the
# same "Cannot find module" class of bug for local dev, not just
# production.
# ------------------------------------------------------------------------
FROM ${DEPS_IMAGE} AS dev

COPY . .

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

# Prisma's client is generated here (not baked into a shared dev image)
# because dev mode bind-mounts the host's schema.prisma directly — a
# schema edit on the host should be picked up on container restart
# without rebuilding the image. Kept as a small, additive fix: the
# pre-migration dev stage never generated a client at all.
CMD ["sh", "-c", "pnpm --filter @rmsm/database generate && pnpm --filter @rmsm/api dev"]

# ------------------------------------------------------------------------
# artifacts — not a runtime stage, exists only so `production` below has
# something to COPY --from=. This is the shared workspace build produced
# once by docker/build.Dockerfile (install, Prisma generate, turbo build
# for the whole workspace) and reused here without re-running any of it.
# ------------------------------------------------------------------------
FROM ${BUILD_IMAGE} AS artifacts

# ------------------------------------------------------------------------
# production — used by ../../infra/docker/docker-compose.prod.yml
# (target: production). Minimal runtime image: no build tooling, no other
# applications' source, no .git, no Turbo cache — only what @rmsm/api
# needs to run. Never copies the whole repository (see the comment block
# near the top of docker/runtime-node.Dockerfile for exactly why
# node_modules and packages/ are both required together, and why this
# image cannot be pruned to --prod-only dependencies while apps/api still
# needs ts-node/register at runtime).
# ------------------------------------------------------------------------
FROM ${BASE_IMAGE} AS production

ENV NODE_ENV=production \
    APP_NAME=api \
    APP_PORT=3001

WORKDIR /workspace

COPY --from=artifacts /workspace/package.json ./package.json
COPY --from=artifacts /workspace/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=artifacts /workspace/node_modules ./node_modules
COPY --from=artifacts /workspace/packages ./packages
COPY --from=artifacts /workspace/apps/api/dist ./apps/api/dist
COPY --from=artifacts /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=artifacts /workspace/apps/api/tsconfig.json ./apps/api/tsconfig.json

# The same reusable entrypoint docker/runtime-node.Dockerfile uses,
# copied from the platform's checked-in scripts (not a build artifact).
# It runs `node -r ts-node/register apps/api/dist/main.js` — the fix
# already applied to apps/api/package.json's own "start" script earlier
# in this repository's history. The pre-migration production stage's
# `CMD ["node", "apps/api/dist/main.js"]` predated that fix and would
# have reintroduced ERR_UNSUPPORTED_DIR_IMPORT at container startup; this
# migration corrects that as a direct consequence of reusing the shared
# platform's own, already-correct startup script.
COPY docker/scripts/start-node.sh /usr/local/bin/start-node.sh
RUN chmod +x /usr/local/bin/start-node.sh

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

USER rmsm

ENTRYPOINT ["/usr/local/bin/start-node.sh"]
