# syntax=docker/dockerfile:1
FROM node:24-alpine AS base
# API Runtime Recovery, Milestone 5 -- node:24-alpine does not ship
# OpenSSL at all. Prisma's own runtime probe (which the "Prisma failed
# to detect the libssl/openssl version to use" warning comes from) has
# nothing to detect without it, and silently guesses the wrong default
# (openssl-1.1.x) instead of matching this image's actual OpenSSL 3.x
# Alpine baseline -- then fails to load its query engine binary, which
# was generated for the guessed (wrong) target. Installing openssl here
# lets Prisma correctly detect OpenSSL 3.x at runtime; the matching
# schema.prisma binaryTargets change (see packages/database/prisma/
# schema.prisma) makes `prisma generate` produce the right engine binary
# in the first place, so this isn't relying on runtime detection alone.
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/decision/package.json packages/decision/package.json
COPY packages/execution/package.json packages/execution/package.json
COPY packages/market/package.json packages/market/package.json
COPY packages/opportunity/package.json packages/opportunity/package.json
COPY packages/portfolio/package.json packages/portfolio/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/strategy/package.json packages/strategy/package.json
COPY packages/types/package.json packages/types/package.json
RUN pnpm install --frozen-lockfile --filter @rmsm/api...

FROM deps AS dev
COPY . .
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
# API Runtime Recovery -- this stage never ran `prisma generate` at all.
# It went straight from `pnpm install` (which only links packages, it
# doesn't touch Prisma's generated client) to `nest start --watch`. That
# means the dev container's TypeScript compilation has always depended on
# whatever `.prisma/client` output happened to already exist -- generated
# at some earlier point, from whatever schema.prisma existed *then*. Any
# model added to schema.prisma since (Strategy Engine, Profile, ...)
# would compile fine on disk but be invisible to this container until
# something forced a re-generate, which nothing here ever did.
#
# API Runtime Recovery, continued -- this stage ALSO never built
# packages/{core,market,decision,execution,opportunity,portfolio,strategy}.
# Those seven packages publish their public types from compiled
# dist/index.d.ts (package.json "main"/"types"), not from src/ -- see
# TYPE_RESOLUTION_INVESTIGATION.md. `nest start --watch` only watches and
# recompiles apps/api's OWN source; it resolves @rmsm/core, @rmsm/decision,
# etc. as ordinary installed packages, reading whatever dist/*.d.ts already
# exists on disk. Because dev containers bind-mount the repo for live
# reload, that dist/ is whatever was last built on the host -- possibly
# stale relative to current src/, or never built at all -- which is
# exactly the observed symptom: every one of the 12 failing entities
# (Decision, Order, Execution, ExecutionSession, Exchange, Instrument,
# Candle, Opportunity, Portfolio, Position, Trade, Strategy) belongs to
# one of these seven dist-resolved packages, with zero exceptions, while
# their own src/ has always correctly declared `id` (confirmed in
# DOMAIN_IDENTIFIER_AUDIT.md). The `build` stage below already avoids
# this by running `turbo run build` before `nest build`; the dev stage
# needs the equivalent for its dependencies (not for apps/api itself --
# nest's own watcher handles that live).
#
# Run at container-start, like `prisma generate` above, for the same
# reason: bind-mounted source can change after the image was built, so a
# build-time-only compile would just go stale again the same way.
# Named explicitly (rather than a `^pkg...`-style dependency filter) --
# an earlier attempt at that filter syntax failed at runtime with
# "No package found with name '^@rmsm/api'" (Turbo 2.10.7 did not accept
# the caret in that position), so this lists exactly the seven
# dist-resolved packages by name instead. Multiple --filter flags
# combine as a union (confirmed in Turborepo's own docs), and each
# package's own "build" task still runs through Turbo's normal
# dependency graph (`dependsOn: ["^build", ...]`), so they still build
# in correct topological order relative to each other. apps/api itself
# is deliberately not included here: `nest start --watch` already
# recompiles its source live, so running `nest build` for it here would
# be redundant work on every container start.
CMD ["sh", "-c", "pnpm --filter @rmsm/database generate && pnpm exec turbo run build --filter=@rmsm/core --filter=@rmsm/market --filter=@rmsm/decision --filter=@rmsm/execution --filter=@rmsm/opportunity --filter=@rmsm/portfolio --filter=@rmsm/strategy && pnpm --filter @rmsm/api dev"]

FROM deps AS build
COPY . .
RUN pnpm --filter @rmsm/database generate
# WM-021 — @rmsm/api's workspace dependencies (config/core/database/
# decision/execution/market/opportunity/portfolio/shared/strategy/types)
# now compile to their own dist/ output like any other npm package,
# instead of `nest build` resolving them straight from .ts source. They
# have to be built, in dependency order, before `nest build` runs --
# `turbo run build --filter=@rmsm/api...` does exactly that (same
# topological graph the root `pnpm build` uses), then builds api itself
# last.
RUN pnpm exec turbo run build --filter=@rmsm/api...

FROM node:24-alpine AS production
# Same OpenSSL gap as the `base` stage above -- this stage is a fresh
# `FROM node:24-alpine`, not derived from `base`, so it needs its own
# `apk add openssl` rather than inheriting the earlier one.
RUN apk add --no-cache openssl
RUN corepack enable
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages ./packages
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
USER node
CMD ["node", "apps/api/dist/main.js"]
