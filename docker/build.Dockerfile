# syntax=docker/dockerfile:1.7
#
# ==============================================================================
# RMSM Docker Platform — build.Dockerfile
# ==============================================================================
#
# Purpose
# -------
# The one place source code enters this pipeline, the one place Prisma's
# client is generated, and the one place the workspace is built — for
# every application at once, via Turborepo's own dependency graph. Every
# runtime image downstream (runtime-node, runtime-next) copies its
# artifacts out of the result of this single stage; none of them re-run
# install, re-generate Prisma, or re-build anything themselves.
#
# Why one shared build instead of one build per application
# ------------------------------------------------------------
# apps/api, apps/web, and apps/admin all depend on overlapping sets of
# workspace packages. Building each application in its own isolated
# Docker stage would mean redundantly installing and building those
# shared packages three times, in three separate Turbo cache spaces, with
# three separate opportunities for the "Docker build behaves differently
# than local build" drift called out in the task brief. Building the
# whole workspace once, here, with one Turbo invocation and one Turbo
# cache, is what "Single build pipeline" and "Docker build and local
# build behave differently" resolve to concretely: this stage runs the
# exact same `pnpm turbo run build` a developer runs locally, with no
# Docker-specific build variant.
#
# Stage responsibilities (and nothing else)
#   - Copy the full repository (the first point in this pipeline that
#     needs application source).
#   - Complete dependency linking (`pnpm install --offline`), using the
#     store deps.Dockerfile already populated — no network access needed.
#   - Generate the Prisma client exactly once, from the one package that
#     owns the schema (@rmsm/database).
#   - Build every workspace package/application that declares a "build"
#     script, in Turbo's own dependency order.
#   - Produce build artifacts (apps/*/dist, apps/*/.next) for the runtime
#     stages to copy out of.
#
# This stage has no CMD/ENTRYPOINT and is never run as a container — it
# exists to be copied FROM, not to be started.
#
# Build
#   docker build -f docker/build.Dockerfile \
#     --build-arg DEPS_IMAGE=rmsm/deps:latest \
#     -t rmsm/build:latest .
# ==============================================================================

ARG DEPS_IMAGE=rmsm/deps:latest
FROM ${DEPS_IMAGE} AS build

# The full repository, for the first and only time in this pipeline.
# Every stage before this one (base, deps) never depended on application
# source, so their Docker cache survives every commit that doesn't touch
# the lockfile or workspace glob patterns. This COPY is the layer that
# correctly invalidates on essentially every commit — that is expected
# and appropriate, because this is the one stage whose job requires
# source.
#
# A .dockerignore at the repository root (see docker/README.md /
# migration guide) keeps this from also copying node_modules, .git,
# build output from a developer's own machine, etc.
COPY . .

# Completes what `pnpm fetch` (deps.Dockerfile) started. Every workspace
# package.json is present now, so pnpm can resolve the complete workspace
# graph — including internal `workspace:*` links between RMSM packages —
# and link a real node_modules tree, entirely from the store deps.Dockerfile
# already populated. `--offline` makes that explicit: this fails loudly
# instead of silently reaching out to the registry if the store were ever
# incomplete, and `--frozen-lockfile` guarantees this install can never
# quietly drift from the committed lockfile.
RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --offline --frozen-lockfile

# One Prisma generation, for the one package that owns the schema. Every
# workspace package that imports @rmsm/database (apps/api and several
# packages/*) reads the client this produces from
# packages/database/node_modules/.prisma — none of them re-run `prisma
# generate` themselves, which is what "One Prisma generation" means in
# practice: the generation command appears exactly once in this entire
# platform, in this file.
RUN pnpm --filter @rmsm/database generate

# One build for the whole workspace, using Turbo's own dependency graph —
# not a hand-maintained build order. `turbo run build` only runs the
# "build" script in packages that actually declare one (several RMSM
# packages are intentionally consumed straight from their own `src/` and
# have no build step at all — that existing architecture is unchanged
# here), and topologically builds every package a given application
# depends on before building the application itself.
#
# The Turbo cache mount lets unchanged packages come back as cache hits
# on every subsequent image build, the same way `turbo run build` is
# cache-accelerated on a developer's own machine — this is the concrete
# mechanism behind "Docker build and local build behave differently" no
# longer being true: they now share the same tool, the same graph, and
# (via the mount) largely the same cache semantics.
RUN --mount=type=cache,id=rmsm-turbo-cache,target=/workspace/.turbo \
    pnpm turbo run build

# Intentionally no CMD, no ENTRYPOINT, no EXPOSE, no USER switch below
# this line — this stage produces artifacts, it does not run them.
