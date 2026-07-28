// ==============================================================================
// RMSM Docker Platform — docker-bake.hcl
// ==============================================================================
//
// Purpose
// -------
// Wires base -> deps -> build -> {api, web, admin} into a single graph
// that `docker buildx bake` can execute with one command, either locally
// or in CI (GitHub Actions' docker/bake-action consumes this file
// directly). This is what makes the five-Dockerfile pipeline in docker/
// behave like one build, not five manual steps a developer has to
// remember to run in order.
//
// How stage-chaining works without a registry round-trip
// -----------------------------------------------------------
// Each Dockerfile in this platform declares `ARG BASE_IMAGE=rmsm/...:latest`
// and then `FROM ${BASE_IMAGE}`. The `contexts` block below maps that
// exact default image reference to `target:<name>`, which tells BuildKit
// to substitute the named target's own build output directly as the
// FROM source for the dependent target — no `docker push`/`pull`, no
// intermediate registry, and the substitution works whether the default
// tag is used or overridden.
//
// This requires the `docker-container` buildx driver (the default
// `docker` driver cannot share build results between targets in one
// invocation). See docker/README.md's build-order section for the
// one-time `docker buildx create --use` setup this implies.
//
// Usage
//   docker buildx bake -f docker/docker-bake.hcl              # everything
//   docker buildx bake -f docker/docker-bake.hcl api           # just apps/api's image (and its dependencies)
//   docker buildx bake -f docker/docker-bake.hcl web admin     # both Next apps
//   docker buildx bake -f docker/docker-bake.hcl --print        # show the resolved graph without building
// ==============================================================================

variable "REGISTRY" {
  default = "rmsm"
}

variable "TAG" {
  default = "latest"
}

group "default" {
  targets = ["api", "web", "admin"]
}

// ---------------------------------------------------------------------------
// Platform layers — never run directly, only ever consumed by later targets.
// ---------------------------------------------------------------------------

target "base" {
  dockerfile = "docker/base.Dockerfile"
  context    = "."
  tags       = ["${REGISTRY}/base:${TAG}"]
}

target "deps" {
  dockerfile = "docker/deps.Dockerfile"
  context    = "."
  contexts = {
    "rmsm/base:latest" = "target:base"
  }
  tags = ["${REGISTRY}/deps:${TAG}"]
}

target "build" {
  dockerfile = "docker/build.Dockerfile"
  context    = "."
  contexts = {
    "rmsm/deps:latest" = "target:deps"
  }
  tags = ["${REGISTRY}/build:${TAG}"]
}

// ---------------------------------------------------------------------------
// Runtime images — these are the images that actually get pushed/deployed.
// ---------------------------------------------------------------------------

target "api" {
  dockerfile = "docker/runtime-node.Dockerfile"
  context    = "."
  contexts = {
    "rmsm/base:latest"  = "target:base"
    "rmsm/build:latest" = "target:build"
  }
  args = {
    APP_NAME = "api"
    APP_PORT = "3001"
  }
  tags = ["${REGISTRY}/api:${TAG}"]
}

target "web" {
  dockerfile = "docker/runtime-next.Dockerfile"
  context    = "."
  contexts = {
    "rmsm/base:latest"  = "target:base"
    "rmsm/build:latest" = "target:build"
  }
  args = {
    APP_NAME = "web"
    APP_PORT = "3000"
  }
  tags = ["${REGISTRY}/web:${TAG}"]
}

target "admin" {
  dockerfile = "docker/runtime-next.Dockerfile"
  context    = "."
  contexts = {
    "rmsm/base:latest"  = "target:base"
    "rmsm/build:latest" = "target:build"
  }
  args = {
    APP_NAME = "admin"
    APP_PORT = "3002"
  }
  tags = ["${REGISTRY}/admin:${TAG}"]
}
