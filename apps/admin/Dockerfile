# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile --filter @rmsm/admin...

FROM deps AS dev
COPY . .
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/health || exit 1
CMD ["pnpm", "--filter", "@rmsm/admin", "dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @rmsm/admin build

# ─────────────────────────────────────────────────────────────────────────
# production: same standalone-output approach as apps/web — see that
# Dockerfile's comment for the full reasoning (verified directly this
# milestone against apps/web's own output).
#
# Real bug fixed here: the previous version's CMD ran plain `next start`
# with no port flag and no PORT env var, so it always bound to Next's
# default port 3000 — while EXPOSE said 3000 too, but the HEALTHCHECK
# (correctly) checked :3002, admin's real configured port
# (ADMIN_PORT=3002 — see apps/admin/package.json's own dev/start scripts).
# The healthcheck would never have passed. Fixed by setting PORT=3002,
# which Next's standalone server.js reads directly.
# ─────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache tini \
  && rm -rf /var/cache/apk/*
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/apps/admin/.next/standalone ./
COPY --from=build /workspace/apps/admin/.next/static ./apps/admin/.next/static
# No `public/` directory exists in apps/admin today (verified) — see
# apps/web/Dockerfile's identical note.
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/health || exit 1
USER node
ENV PORT=3002 HOSTNAME=0.0.0.0
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/admin/server.js"]
