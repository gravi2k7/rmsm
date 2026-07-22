# syntax=docker/dockerfile:1

FROM node:20-bookworm-slim AS base

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openssl \
        ca-certificates \
        tini && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /workspace
WORKDIR /workspace

# ─────────────────────────────────────────────────────────────────────────
# deps: full install (incl. devDependencies) — used by `dev` and `build`.
# Every workspace package.json apps/api transitively depends on must be
# copied here, or pnpm's filtered install can't resolve the dependency
# graph correctly. The previous version of this file copied only 4 of the
# 11 — found and fixed via an actual `pnpm install --filter` dry run this
# milestone, not a hypothetical.
# ─────────────────────────────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/market/package.json packages/market/package.json
COPY packages/strategy/package.json packages/strategy/package.json
COPY packages/opportunity/package.json packages/opportunity/package.json
COPY packages/decision/package.json packages/decision/package.json
COPY packages/execution/package.json packages/execution/package.json
COPY packages/portfolio/package.json packages/portfolio/package.json
RUN pnpm install --frozen-lockfile --filter @rmsm/api...

FROM deps AS dev
COPY . .

RUN pnpm --filter @rmsm/database generate

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["pnpm", "--filter", "@rmsm/api", "dev"]

FROM deps AS build
COPY . .
RUN node -v && \
    cat /etc/os-release && \
    openssl version || true && \
    ldconfig -p | grep ssl || true
# Locate the REAL generated Prisma client output — never assumed, never
# hardcoded. A previous version of this Dockerfile hardcoded one
# specific nested path
# (node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/node_modules/.prisma),
# verified correct in the sandbox it was authored in, and it still
# failed in a real build ("cp: can't stat") — proof that pnpm's exact
# virtual-store nesting is not safe to assume across environments/
# versions. This instead finds every `.prisma/client/index.js` anywhere
# under node_modules and keeps the LARGEST by file size: a real
# generated client is many KB; an un-generated placeholder (which can
# coexist at another plausible-looking path — confirmed directly: this
# repo's own node_modules had exactly that, a stale ~2KB file at a
# different nesting depth than the real ~16KB one) is a few hundred
# bytes to a few KB. This correctly disambiguates regardless of which
# specific path either one lives at, in any pnpm/Prisma version.
RUN set -eux; \
  GENERATED_INDEX="$(find node_modules -type f -path '*/.prisma/client/index.js' -exec ls -la {} \; | sort -k5 -n -r | head -1 | awk '{print $NF}')"; \
  test -n "$GENERATED_INDEX"; \
  GENERATED_DIR="$(dirname "$GENERATED_INDEX")"; \
  echo "Discovered generated Prisma client at: $GENERATED_DIR ($(wc -c < "$GENERATED_INDEX") bytes)"; \
  RELATIVE_PATH="${GENERATED_DIR#node_modules/}"; \
  mkdir -p /tmp/prisma-artifact; \
  cp -r "$GENERATED_DIR" /tmp/prisma-artifact/client; \
  echo "$RELATIVE_PATH" > /tmp/prisma-artifact/RELATIVE_PATH.txt
RUN pnpm --filter @rmsm/api... run build

# ─────────────────────────────────────────────────────────────────────────
# prod-deps: a SEPARATE install, `--prod` only — no jest/eslint/typescript/
# ts-jest/@types/* etc. reach the final image. Copying node_modules out of
# the `deps`/`build` stages (the previous approach) would carry every
# devDependency into production; this is the actual fix for Objective 3.
# ─────────────────────────────────────────────────────────────────────────
FROM base AS prod-deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/market/package.json packages/market/package.json
COPY packages/strategy/package.json packages/strategy/package.json
COPY packages/opportunity/package.json packages/opportunity/package.json
COPY packages/decision/package.json packages/decision/package.json
COPY packages/execution/package.json packages/execution/package.json
COPY packages/portfolio/package.json packages/portfolio/package.json
RUN pnpm install --prod --frozen-lockfile --filter @rmsm/api...

# ─────────────────────────────────────────────────────────────────────────
# production: final runtime image.
#
# tini as PID 1 (via ENTRYPOINT): Node running directly as PID 1 in a
# container does not reliably forward SIGTERM to itself the way a normal
# process does, and doesn't reap zombie processes — tini is the standard,
# minimal (~10 KB, no extra libs) fix, and is what makes the SIGTERM
# graceful-shutdown path (Objective 6, wired in apps/api/src/main.ts via
# app.enableShutdownHooks() — Milestone 5.1.2) actually reach the Node
# process promptly.
#
# tsx (`-r tsx/cjs`): every @rmsm/* workspace package apps/api depends on
# is TS-source-only (package.json "main": "./src/index.ts", no build
# script — by this monorepo's existing, deliberate design; see
# packages/config/README.md) and `nest build`'s plain tsc compile does not
# bundle or transpile them. Verified directly this milestone: running
# `node dist/src/main.js` alone throws ERR_UNSUPPORTED_DIR_IMPORT trying
# to resolve @rmsm/config; adding tsx as the require-time loader fixes
# this without changing any package's source, main field, or build
# process — i.e. without touching architecture. This is a deliberate,
# narrow, documented exception to Objective 8 ("remove unnecessary
# runtime tooling"): without it, this image cannot start at all. See
# infra/docker/README.md for the full tradeoff writeup and the two
# alternatives considered (per-package tsc builds; a NestJS webpack
# bundle) and why neither was attempted in this milestone.
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates \
      tini \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
ENV NODE_ENV=production
# pnpm's default node-linker does NOT hoist a workspace package's own
# direct dependencies to the workspace root node_modules — it symlinks
# them ONLY inside that package's own node_modules folder (confirmed
# directly: `ls node_modules/@nestjs` at the workspace root finds
# nothing; `ls apps/api/node_modules/@nestjs` finds the real symlinks).
# Both copies below are required together — the workspace-root
# node_modules supplies the shared .pnpm store those symlinks point
# INTO, apps/api/node_modules supplies the symlinks themselves.
COPY --from=prod-deps /workspace/node_modules ./node_modules
# `prisma generate`'s real output only exists in the `build` stage
# (`prisma` itself is a devDependency of @rmsm/database, confirmed
# directly, so it's correctly absent from `prod-deps`'s `--prod`-only
# install and `generate` cannot be re-run there). The `node_modules`
# copied above comes from `prod-deps`'s own, entirely separate
# `pnpm install`, which reconstructs node_modules/.pnpm from scratch and
# never had `generate` run against it — this is what throws
# "@prisma/client did not initialize yet" at runtime if left unfixed.
#
# Fixed by placing the artifact the `build` stage's own discovery step
# already located (see that stage's own comment for why this is
# discovered dynamically, never hardcoded) at the exact same
# node_modules-relative path within `prod-deps`'s tree. This works
# because `build` and `prod-deps` install from the identical frozen
# lockfile and therefore produce structurally identical relative paths
# for the same package version — but WHICH path that is, is never
# assumed here, only reused from what was actually discovered.
COPY --from=build /tmp/prisma-artifact /tmp/prisma-artifact
RUN set -eux; \
  RELATIVE_PATH="$(cat /tmp/prisma-artifact/RELATIVE_PATH.txt)"; \
  TARGET_DIR="node_modules/${RELATIVE_PATH}"; \
  echo "Placing generated Prisma client at: $TARGET_DIR"; \
  rm -rf "$TARGET_DIR"; \
  mkdir -p "$(dirname "$TARGET_DIR")"; \
  cp -r /tmp/prisma-artifact/client "$TARGET_DIR"; \
  rm -rf /tmp/prisma-artifact; \
  test -f "$TARGET_DIR/index.js"
COPY --from=prod-deps /workspace/apps/api/node_modules ./apps/api/node_modules
# `packages` (every @rmsm/* workspace package apps/api depends on) comes
# from `build`, not `prod-deps`: as of Milestone 5.1.2's workspace
# packaging work, every one of them has a real `build` script
# (tsc -p tsconfig.build.json, see e.g. packages/config/tsconfig.build.json)
# producing real compiled CommonJS in dist/, with package.json's "main"
# pointing there — and only `build` actually runs those build scripts
# (`prod-deps` only ever copies package.json manifests, by design, so its
# own `pnpm install --prod` layer caches independently of source
# changes). This is what makes plain `node dist/src/main.js` below fully
# self-sufficient now: `require("@rmsm/config")` resolves the
# apps/api/node_modules/@rmsm/config symlink to packages/config, reads
# its package.json "main": "./dist/index.js", and finds real,
# already-compiled JavaScript — no TypeScript source, no runtime loader,
# involved at all. (Earlier revisions of this file used `tsx` as a
# require-time loader specifically because these packages had no build
# step yet and "main" pointed at raw .ts source; that workaround is
# fully retired now that the packages are properly built.)
COPY --from=build /workspace/packages ./packages
# Each package's own `src/` (and build-only tsconfig*.json) ships
# alongside `dist/` in the `build` stage above, since `build` also needs
# it for typecheck/lint/test — but production only ever requires
# `dist/` + `package.json` at runtime. Stripped here rather than via a
# more surgical (and fragile — every package's dist/ folder has the same
# name, risking collisions under Docker's wildcard COPY) per-package
# COPY, to keep the final image smaller and avoid shipping raw
# TypeScript source into production at all.
RUN find packages -mindepth 2 -maxdepth 2 \( -name src -o -name "tsconfig*.json" \) -exec rm -rf {} +
# Build-time verification (Milestone 5.1.4): actually require("@prisma/client")
# and instantiate `new PrismaClient()` against this image's exact final
# assembled state — not merely a file-existence check — so the `docker
# build` itself fails loudly if Prisma is ever packaged incorrectly again,
# rather than shipping a silently-broken image. Run from
# packages/database, not apps/api: @prisma/client is @rmsm/database's own
# direct dependency (correctly resolvable there under pnpm's non-hoisting
# node-linker — see the COPY/RUN block above), not apps/api's, so running
# this from apps/api's own directory would fail to resolve @prisma/client
# at all and report a misleading error unrelated to whether Prisma was
# actually generated correctly.
RUN cd packages/database && node -e "\
  const { PrismaClient } = require('@prisma/client'); \
  new PrismaClient(); \
  console.log('Prisma verification passed: require(\\\"@prisma/client\\\") and new PrismaClient() both succeeded.'); \
"
WORKDIR /workspace/apps/api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
