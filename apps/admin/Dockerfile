# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /workspace

FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch

FROM deps AS dev
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/health || exit 1
CMD ["pnpm", "--filter", "@rmsm/admin", "dev"]

FROM deps AS build

COPY . .

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

RUN pnpm --filter @rmsm/database generate

RUN --mount=type=cache,id=rmsm-turbo-cache,target=/workspace/.turbo \
    pnpm turbo run build

FROM node:24-alpine AS production
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/apps/admin/.next ./apps/admin/.next
COPY --from=build /workspace/apps/admin/package.json ./apps/admin/package.json
COPY --from=build /workspace/apps/admin/next.config.mjs ./apps/admin/next.config.mjs
COPY --from=build /workspace/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3002/api/health || exit 1
USER node
CMD ["node_modules/.bin/next", "start", "--prefix", "apps/admin"]
