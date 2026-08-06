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

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/api/health || exit 1

CMD ["pnpm","--filter","@rmsm/admin","dev"]

FROM deps AS build

COPY . .

RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

RUN pnpm --filter @rmsm/database generate

RUN --mount=type=cache,id=rmsm-turbo-cache,target=/workspace/.turbo \
    pnpm turbo run build

FROM node:24-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002
ENV HOSTNAME=0.0.0.0

COPY --from=build --chown=node:node /workspace/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/admin/.next/static ./apps/admin/.next/static

USER node

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3002/api/health || exit 1

CMD ["node", "apps/admin/server.js"]