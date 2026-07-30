# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
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
# WM-021 — @rmsm/shared and @rmsm/types now ship real dist/ builds
# (no longer in this app's `transpilePackages`, see next.config.mjs), so
# they need to be built before `next build` resolves them as ordinary
# pre-compiled packages. `turbo run build --filter=@rmsm/web...` builds
# them (and @rmsm/ui, which stays source-based but this is harmless/
# fast for it) in dependency order, then builds the app itself last --
# same topological graph the root `pnpm build` uses.
RUN pnpm exec turbo run build --filter=@rmsm/web...

FROM node:24-alpine AS production
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/apps/web/.next ./apps/web/.next
COPY --from=build /workspace/apps/web/public ./apps/web/public
COPY --from=build /workspace/apps/web/package.json ./apps/web/package.json
COPY --from=build /workspace/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY --from=build /workspace/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
USER node
CMD ["node_modules/.bin/next", "start", "--prefix", "apps/web"]
