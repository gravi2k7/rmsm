# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
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
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
CMD ["pnpm", "--filter", "@rmsm/api", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @rmsm/database generate
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
FROM node:20-alpine AS production
RUN apk add --no-cache tini \
  && rm -rf /var/cache/apk/*
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
# pnpm's default node-linker does NOT hoist a workspace package's own
# direct dependencies to the workspace root node_modules — it symlinks
# them ONLY inside that package's own node_modules folder (confirmed
# directly: `ls node_modules/@nestjs` at the workspace root finds
# nothing; `ls apps/api/node_modules/@nestjs` finds the real symlinks).
# Both copies below are required together — the workspace-root
# node_modules supplies the shared .pnpm store those symlinks point
# INTO, apps/api/node_modules supplies the symlinks themselves.
COPY --from=prod-deps /workspace/node_modules ./node_modules
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
WORKDIR /workspace/apps/api
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/src/main.js"]
