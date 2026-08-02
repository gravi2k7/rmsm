# syntax=docker/dockerfile:1.7

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

CMD ["sh", "-c", "pnpm --filter @rmsm/database generate && pnpm exec turbo run build --filter=@rmsm/database --filter=@rmsm/core --filter=@rmsm/market --filter=@rmsm/decision --filter=@rmsm/execution --filter=@rmsm/opportunity --filter=@rmsm/portfolio --filter=@rmsm/strategy && pnpm --filter @rmsm/api dev"]
# Prisma's client is generated on every container start (not baked into
# the image) because dev mode bind-mounts the host's schema.prisma
# directly — a schema edit on the host should be picked up on container
# restart without an image rebuild.

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