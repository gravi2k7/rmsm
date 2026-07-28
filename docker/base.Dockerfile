# syntax=docker/dockerfile:1.7
#
# ==============================================================================
# RMSM Docker Platform — base.Dockerfile
# ==============================================================================
#
# Purpose
# -------
# The single foundation every other image in this platform (deps, build,
# runtime-node, runtime-next) is built on top of. This stage knows nothing
# about pnpm workspaces, applications, packages, or dependencies — only the
# OS-level tooling every later stage needs. That separation is deliberate:
# it is what lets "add a workspace package" or "add an application" happen
# without ever touching this file again.
#
# Responsibilities (and nothing else)
#   - Node 24 runtime
#   - Corepack (for a pnpm version pinned by the repository itself, not by
#     this Dockerfile)
#   - OpenSSL (Prisma's query engine requires it on Alpine/musl)
#   - Git (some tooling/transitive installs shell out to it)
#   - bash (docker/scripts/*.sh are bash; Alpine's default shell, ash, does
#     not support everything they use)
#   - A working directory
#   - A non-root user every runtime image runs as
#
# Build
#   docker build -f docker/base.Dockerfile -t rmsm/base:latest .
#
# This image is never run directly — it is only ever used as a build
# argument (BASE_IMAGE) for the stages that follow it.
# ==============================================================================

ARG NODE_VERSION=24-alpine
FROM node:${NODE_VERSION} AS base

LABEL org.opencontainers.image.title="rmsm-docker-base" \
      org.opencontainers.image.description="RMSM platform base image: Node 24, Corepack/pnpm, OS build tooling. No application code, no workspace awareness." \
      org.opencontainers.image.vendor="RMSM Enterprise Platform"

# openssl        - required at runtime by Prisma's query engine (musl/Alpine).
# ca-certificates - required for any outbound HTTPS (registry access at
#                   build time, external API calls at runtime).
# git            - some package resolution / tooling shells out to git.
# bash           - docker/scripts/*.sh require bash, not ash.
# libc6-compat   - several native Node addons expect glibc-compatible
#                   symbols even when running on musl-based Alpine.
RUN apk add --no-cache \
      openssl \
      ca-certificates \
      git \
      bash \
      libc6-compat \
    && rm -rf /var/cache/apk/*

# Corepack ships inside Node itself — no separate install step. Enabling it
# here (without pinning a version) means the exact pnpm version is resolved
# lazily, the first time `pnpm` runs inside a directory whose nearest
# package.json declares a "packageManager" field. Every RMSM package.json
# inherits that field from the workspace root, so the pnpm version used
# across every image in this pipeline can only ever change by editing the
# root package.json — never a Dockerfile. This is what "Do not change
# Package dependencies" implies for the platform layer: nothing here is a
# second place a pnpm version could drift out of sync.
RUN corepack enable

# A dedicated, unprivileged user that every *runtime* image (not this one,
# not deps, not build) switches to before executing application code.
# Declaring it once, here, means its uid/gid (1001) is identical across
# every RMSM image — which matters the moment any of them run under a
# Kubernetes PodSecurityContext with a shared fsGroup, or share a bind
# mount in Docker Compose.
RUN addgroup -g 1001 -S rmsm \
    && adduser -u 1001 -S rmsm -G rmsm -h /workspace -s /bin/bash

WORKDIR /workspace

# Intentionally no COPY, no RUN pnpm install, no application source below
# this line. Anything workspace- or application-specific belongs in
# deps.Dockerfile, build.Dockerfile, or a runtime-*.Dockerfile instead.
