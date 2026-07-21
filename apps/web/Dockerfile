# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile --filter @rmsm/web...

FROM deps AS dev
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
CMD ["pnpm", "--filter", "@rmsm/web", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @rmsm/web build

# ─────────────────────────────────────────────────────────────────────────
# production: uses Next's own `output: "standalone"` build (next.config.mjs
# — Milestone 5.1.2), which traces the actual production dependency subset
# into .next/standalone rather than requiring the full node_modules tree.
# Verified directly this milestone: `node apps/web/server.js` run from a
# copy of this exact output structure serves real HTTP 200 responses and
# exits cleanly on SIGTERM — Next's standalone server has its own built-in
# graceful-shutdown handling (Objective 6), no extra wiring needed here,
# unlike apps/api.
#
# Static assets and public/ are NOT included in .next/standalone by
# design (Next's own docs) — they're copied in separately below.
#
# tini as PID 1: same reasoning as apps/api's Dockerfile — Node as raw
# PID 1 doesn't reliably forward signals or reap zombies. Cheap, standard,
# worth doing even though Next's own server.js already handles SIGTERM
# reasonably on its own.
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache tini \
  && rm -rf /var/cache/apk/*
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/apps/web/.next/standalone ./
COPY --from=build /workspace/apps/web/.next/static ./apps/web/.next/static
# No `public/` directory exists in apps/web today (verified) — a COPY of a
# nonexistent source path fails a Docker build outright, so this is
# intentionally omitted rather than papered over with a fabricated empty
# directory. Add `COPY --from=build /workspace/apps/web/public
# ./apps/web/public` back here if/when one is introduced.
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
USER node
ENV PORT=3000 HOSTNAME=0.0.0.0
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
