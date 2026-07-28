# syntax=docker/dockerfile:1.7
#
# ==============================================================================
# RMSM Docker Platform — deps.Dockerfile
# ==============================================================================
#
# Purpose
# -------
# Install every workspace package's dependencies, once, for the entire
# monorepo — without ever reading, listing, or copying a single workspace
# package.json. That last part is the actual architectural fix this file
# delivers: the old per-app Dockerfiles copied individual package.json
# files by hand, so a new workspace package (or a changed dependency
# between existing ones) silently would not be reflected in the Docker
# image unless someone remembered to update the COPY list. At ~50 packages
# and growing, that already broke silently (apps/api's own Dockerfile was
# missing COPY lines for several packages/* it actually depends on).
#
# How automatic workspace discovery actually works here
# -------------------------------------------------------
# `pnpm-lock.yaml` is not a hint about the workspace graph, it IS the fully
# resolved workspace graph — every package, every version, every workspace
# link, already computed. `pnpm fetch` reads that lockfile directly and
# downloads every package it names into pnpm's content-addressable store,
# without needing a single package.json from anywhere in the workspace.
# Adding, removing, or renaming a workspace package changes zero lines in
# this Dockerfile, because this Dockerfile never enumerates packages at
# all — it delegates entirely to the lockfile.
#
# What this stage deliberately does NOT do
#   - No application source is copied (only the three manifest files
#     needed to resolve dependencies).
#   - No `pnpm install` / workspace linking happens here — linking needs
#     every package.json to resolve internal `workspace:*` references,
#     which isn't available until build.Dockerfile copies the full repo.
#     This stage only populates the shared pnpm store.
#   - No build of any kind.
#
# Docker cache behavior
# ----------------------
# This layer's cache key is derived only from pnpm-lock.yaml,
# pnpm-workspace.yaml, and the root package.json. Application code changes
# — which happen on essentially every commit — never invalidate it. The
# expensive network fetch of every dependency in the workspace therefore
# only re-runs when the dependency graph itself actually changes.
#
# Build
#   docker build -f docker/deps.Dockerfile \
#     --build-arg BASE_IMAGE=rmsm/base:latest \
#     -t rmsm/deps:latest .
# ==============================================================================

ARG BASE_IMAGE=rmsm/base:latest
FROM ${BASE_IMAGE} AS deps

# The only three files this stage ever needs:
#   - pnpm-lock.yaml       the fully resolved workspace dependency graph
#   - pnpm-workspace.yaml  the workspace's package glob patterns (so this
#                          layer's cache also correctly invalidates if the
#                          glob patterns themselves change)
#   - package.json (root)  carries the "packageManager" field Corepack
#                          resolves the pinned pnpm version from
#
# No `packages/*/package.json` or `apps/*/package.json` is copied here —
# that is the entire point.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

# `pnpm fetch` downloads every package named in the lockfile into pnpm's
# global content-addressable store. It does not create or touch
# node_modules, and it does not require any workspace package.json to be
# present, which is exactly why this stage can support any number of
# workspace packages — today ~50, tomorrow 200+ — without modification.
#
# The BuildKit cache mount persists pnpm's store across separate `docker
# build` invocations (not just across layers within one build), so a
# second build with an unchanged lockfile downloads nothing at all, even
# on a cold `docker build` with no prior layer cache — the store survives
# independently of image layer caching. This is the "fast Docker caching"
# requirement in practice, not just in theory.
RUN --mount=type=cache,id=rmsm-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm fetch

# Intentionally no COPY of application source, no `pnpm install`, no build
# command below this line.
