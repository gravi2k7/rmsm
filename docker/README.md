# RMSM Docker Platform — Phase 1

Foundation layer for RMSM's Docker infrastructure: a reusable, workspace-aware
build pipeline that replaces the old pattern of one hand-maintained Dockerfile
per application. This document is the full deliverable for Phase 1 — every
item below corresponds to one of the ten required outputs in the Phase 1
task brief.

**Scope note:** this phase creates `docker/` only. `docker-compose.yml`,
`docker-compose.prod.yml`, and the existing `apps/*/Dockerfile` files are
unchanged and continue to be what actually runs today. Phase 2 is where
compose is repointed at these new files; see "Migration guide" below for
exactly what that will involve.

---

## 1. New directory structure

```
docker/
├── README.md                 this file — stages, migration, cache, validation
├── base.Dockerfile           OS + Node 24 + Corepack/pnpm. No app awareness.
├── deps.Dockerfile           Workspace dependency install (pnpm fetch). No source.
├── build.Dockerfile          Full build: install, Prisma generate, turbo build.
├── runtime-node.Dockerfile   Minimal runtime for NestJS-style services (APP_NAME arg).
├── runtime-next.Dockerfile   Minimal runtime for Next.js apps (APP_NAME arg).
├── docker-bake.hcl           Wires all five into one buildable graph.
└── scripts/
    ├── prisma-generate.sh    Reusable Prisma client generation.
    ├── wait-for.sh           Dependency-free TCP readiness wait (Postgres/Redis/any).
    ├── start-node.sh         Entrypoint for runtime-node.Dockerfile.
    └── start-next.sh         Entrypoint for runtime-next.Dockerfile.

.dockerignore                 New, root-level. Required by build.Dockerfile's COPY . .
```

Nothing outside `docker/` and the new root `.dockerignore` was created,
moved, or modified. `infra/docker/` (the existing compose files) is
untouched.

---

## 2. Explanation of every stage

### `base.Dockerfile`
`node:24-alpine` + `openssl`, `ca-certificates`, `git`, `bash`,
`libc6-compat` + `corepack enable` (no pnpm version pinned in the
Dockerfile — Corepack resolves it from the repository's own root
`package.json` `"packageManager"` field the first time `pnpm` runs
against a package.json that declares it) + a non-root `rmsm` user
(uid/gid 1001) + `WORKDIR /workspace`. Contains no application or
workspace awareness at all — this is what every other stage is `FROM`.

### `deps.Dockerfile`
`FROM` base. Copies exactly three files — `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, root `package.json` — and runs `pnpm fetch`, which
downloads every package named in the lockfile into pnpm's content-addressable
store. `pnpm fetch` needs no workspace `package.json` at all, which is the
actual mechanism behind "automatic workspace discovery" and "do not
require manually listing package.json files": the lockfile already *is*
the fully resolved workspace graph. This stage produces no `node_modules`
and does no linking — see `build.Dockerfile` for why.

### `build.Dockerfile`
`FROM` deps. The one point application source enters this pipeline
(`COPY . .`, filtered by the new root `.dockerignore`). Runs
`pnpm install --offline --frozen-lockfile` to complete workspace linking
(this needs every `package.json` to resolve internal `workspace:*`
references, which is why linking waits until source is present, one
stage after the fetch). Then runs `pnpm --filter @rmsm/database generate`
(the one and only Prisma generation in the platform) and
`pnpm turbo run build` (one build, using Turbo's own dependency graph —
only packages that declare a `"build"` script run one; packages
intentionally consumed from raw `src/` are unaffected). Produces
`apps/*/dist` and `apps/*/.next`. No `CMD`/`ENTRYPOINT` — this stage is
only ever copied `FROM`, never run.

### `runtime-node.Dockerfile`
`FROM` base (not build — see cache strategy). Takes `APP_NAME` (required)
and `APP_PORT` (default `3001`) build args. Copies, from the build
image: root `package.json` + `pnpm-workspace.yaml`, the full
`node_modules` + `packages/` (both needed together — several workspace
packages are consumed from raw `src/`, and `node_modules/@rmsm/*` are
symlinks into `packages/*`), and only the target app's `dist/`,
`package.json`, `tsconfig.json`. Copies in `start-node.sh` and
`wait-for.sh`, exposes `APP_PORT`, defines a `/health` `HEALTHCHECK`,
switches to the non-root `rmsm` user, and runs `start-node.sh` as
entrypoint (which execs `node -r ts-node/register`, preserving the
ts-node-registration fix already applied to `apps/api/package.json`'s own
`start` script).

### `runtime-next.Dockerfile`
`FROM` base. Takes `APP_NAME` (required) and `APP_PORT` (default `3000`)
build args. Copies root `package.json`, full `node_modules`, and only the
target app's `.next/`, `public/`, `package.json`, `next.config.mjs` — no
`packages/`, because `apps/web`/`apps/admin` both set `transpilePackages`
in `next.config.mjs`, so those three workspace packages are already
compiled into `.next` by the time `build.Dockerfile` finishes. Runs
`start-next.sh` (`next start --prefix apps/<app> -p <port>`) as a
non-root user, with a `HEALTHCHECK` against the app's root path.

### `docker/scripts/`
Four scripts, none application-specific:
- `prisma-generate.sh` — `pnpm --filter <package> generate`, defaulting
  to `@rmsm/database`. Used by `build.Dockerfile`; also runnable standalone.
- `wait-for.sh` — blocks until `host:port` accepts a TCP connection
  (bash's own `/dev/tcp`, no `netcat` dependency), with a configurable
  timeout and an optional `-- command` to exec into once ready. Not wired
  into any Dockerfile CMD yet — provided now as the required "database
  wait" script category, for Phase 2's compose migration to call directly.
- `start-node.sh` / `start-next.sh` — the entrypoints described above,
  parameterized entirely by `APP_NAME`/`APP_PORT` environment variables.

### `docker-bake.hcl`
A [Buildx bake](https://docs.docker.com/build/bake/) file wiring
`base -> deps -> build -> {api, web, admin}` into one graph, using named
build contexts (`contexts = { "rmsm/base:latest" = "target:base" }`) so
each target's output feeds the next directly, without an intermediate
registry push/pull. `docker buildx bake -f docker/docker-bake.hcl` builds
everything in dependency order in one command; `... api` builds just the
API image (and whatever it depends on). This is also the file GitHub
Actions' `docker/bake-action` consumes directly for CI.

---

## 3. Migration guide

Phase 1 deliberately does not touch `docker-compose.yml`,
`docker-compose.prod.yml`, or any existing `apps/*/Dockerfile` — those
stay authoritative for what actually runs until Phase 2. This section
describes (a) how to build and validate the new pipeline standalone today,
and (b) what Phase 2's compose migration will concretely involve.

### (a) Building and running the new images today, standalone

Manual, one stage at a time (useful for understanding each layer or
debugging a specific stage in isolation):

```bash
docker build -f docker/base.Dockerfile  -t rmsm/base:latest  .
docker build -f docker/deps.Dockerfile  -t rmsm/deps:latest  --build-arg BASE_IMAGE=rmsm/base:latest  .
docker build -f docker/build.Dockerfile -t rmsm/build:latest --build-arg DEPS_IMAGE=rmsm/deps:latest   .

docker build -f docker/runtime-node.Dockerfile -t rmsm/api:latest \
  --build-arg BASE_IMAGE=rmsm/base:latest --build-arg BUILD_IMAGE=rmsm/build:latest \
  --build-arg APP_NAME=api --build-arg APP_PORT=3001 .

docker build -f docker/runtime-next.Dockerfile -t rmsm/web:latest \
  --build-arg BASE_IMAGE=rmsm/base:latest --build-arg BUILD_IMAGE=rmsm/build:latest \
  --build-arg APP_NAME=web --build-arg APP_PORT=3000 .

docker build -f docker/runtime-next.Dockerfile -t rmsm/admin:latest \
  --build-arg BASE_IMAGE=rmsm/base:latest --build-arg BUILD_IMAGE=rmsm/build:latest \
  --build-arg APP_NAME=admin --build-arg APP_PORT=3002 .
```

Or, in one command, once a `docker-container` buildx builder exists
(`docker buildx create --use`, one-time setup):

```bash
docker buildx bake -f docker/docker-bake.hcl
```

Running a built image standalone (no compose yet):

```bash
docker run --rm -p 3001:3001 --env-file .env rmsm/api:latest
docker run --rm -p 3000:3000 --env-file .env rmsm/web:latest
```

### (b) What Phase 2 will change (not done in this phase)

1. Replace each service's `build:` block in `docker-compose.yml` /
   `docker-compose.prod.yml` — currently `dockerfile: apps/<app>/Dockerfile`
   — with `dockerfile: docker/runtime-node.Dockerfile` (api) or
   `docker/runtime-next.Dockerfile` (web, admin), passing `APP_NAME`/
   `APP_PORT` via each service's `build.args`.
2. For local development specifically, decide whether dev containers keep
   using the existing bind-mount + `dev` target pattern (unaffected by
   this phase either way) or move to a `docker/dev.Dockerfile` layered on
   `deps.Dockerfile` — that decision is explicitly out of scope for
   Phase 1's brief, which only asked for the production-oriented
   base/deps/build/runtime pipeline.
3. Wire `docker/scripts/wait-for.sh` into each service's compose command
   (or an init container / Kubernetes initContainer) ahead of
   `depends_on`'s own healthcheck-based gating, if finer-grained readiness
   than Compose's own healthcheck polling is wanted.
4. Retire `apps/*/Dockerfile` once the compose files above are validated
   against the new images end-to-end.
5. Delete this migration-guide section once Phase 2 is complete (it will
   have nothing left to describe).

No application code, Prisma schema, API contract, or `apps/*/Dockerfile`
needs to change for Phase 2 — only the `build:` stanza of each compose
service, and each service's own `Dockerfile` reference.

---

## 4. Compatibility notes

- **`apps/api` still requires `ts-node/register` at runtime.** Several
  workspace packages (`@rmsm/config`, `@rmsm/database`, `@rmsm/ui`,
  `@rmsm/ai-prompts`, `@rmsm/shared`, `@rmsm/logging`, `@rmsm/types`,
  `@rmsm/health`) are intentionally consumed from raw `src/*.ts`, not a
  compiled `dist/`. `runtime-node.Dockerfile`'s `start-node.sh` runs
  `node -r ts-node/register`, matching the fix already applied to
  `apps/api/package.json`'s own `start` script. This is a real
  architectural characteristic of the current codebase, not a Docker
  workaround, and it means:
  - `runtime-node.Dockerfile` ships the **full** `node_modules`
    (including devDependencies like `ts-node`), not a `--prod`-pruned
    tree. A production install that excluded devDependencies would break
    the container at startup. Genuine dependency pruning would require
    either moving `ts-node` into `dependencies` in `apps/api/package.json`
    or changing how those packages are consumed — both explicitly out of
    scope for Phase 1 ("Do NOT change... Package dependencies",
    "Do NOT change... Folder structure outside Docker").
  - `runtime-node.Dockerfile` also copies the entire `packages/`
    directory (not a subset), because determining "exactly which packages
    does this one app need" without hardcoding a list would require a
    tool like `pnpm deploy`/`turbo prune`, whose exact interaction with
    this repository's mixed raw-src/compiled-dist package layout hasn't
    been validated against a real Docker daemon (none is available in
    the environment this Phase 1 work was authored in — see the
    Validation checklist below). Copying the whole directory is the
    lower-risk, provably-correct choice for a foundation phase; revisiting
    it with `pnpm deploy` is a reasonable Phase 2+ optimization once it
    can be validated for real.

- **`apps/web`/`apps/admin` do not use Next's `output: "standalone"`
  mode.** `next.config.mjs` is unchanged (out of scope), so
  `runtime-next.Dockerfile` ships a full `node_modules` + `.next` and
  runs `next start` directly, exactly like the existing (untouched)
  `apps/web/Dockerfile`/`apps/admin/Dockerfile` production stages already
  do. `packages/` is not copied for these two images — `transpilePackages`
  in `next.config.mjs` already inlines `@rmsm/ui`, `@rmsm/shared`, and
  `@rmsm/types` into `.next` at build time.

- **`apps/ai` (Python) is out of scope.** It has no `package.json`, isn't
  a pnpm workspace member, and the task brief's Runtime Images section
  names only Node and Next runtimes. Its existing Dockerfile is also
  explicitly off-limits this phase. A `docker/runtime-python.Dockerfile`
  is a reasonable Phase 2+ addition if this platform is extended to cover it.

- **No `docker` binary/daemon was available while authoring this phase.**
  Every Dockerfile and script here was validated statically (Dockerfile
  frontmatter/instruction correctness, `bash -n` on every script, HCL
  brace-balance and structural review on `docker-bake.hcl`) rather than
  with an actual `docker build`/`docker buildx bake` run. See the
  Validation checklist for exactly what to run for real before treating
  this as production-verified — this mirrors the same limitation already
  disclosed in `docker-compose.prod.yml`'s own header comment.

- **Backward compatible by construction.** `docker-compose.yml`,
  `docker-compose.prod.yml`, and every `apps/*/Dockerfile` are byte-for-byte
  unchanged. Nothing currently running today is affected by this phase.

---

## 5. Docker cache strategy

Layer/cache boundaries were chosen so that the most expensive operations
invalidate the least often:

| Stage | Cache key depends on | Invalidates on |
|---|---|---|
| `base` | `NODE_VERSION` build arg, OS package list in the Dockerfile itself | Editing `base.Dockerfile` (rare) |
| `deps` | `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `package.json` | Any dependency version change — not source changes |
| `build` | Everything `deps` depends on, plus the full repository (`COPY . .`) | Any commit (expected — this is the one stage whose job is to build source) |
| `runtime-node` / `runtime-next` | Everything `build` depends on, plus `APP_NAME`/`APP_PORT` args | Any commit that touches the target app or a package it depends on |

Two additional mechanisms compound with plain layer caching:
- **BuildKit cache mounts** (`--mount=type=cache`) on pnpm's store
  (`deps.Dockerfile`, `build.Dockerfile`) and Turbo's cache
  (`build.Dockerfile`) persist *across separate `docker build` invocations*,
  not just within one build's layer chain — so even a cold `docker build`
  with no reusable image layers still avoids re-downloading unchanged
  dependencies or re-building unchanged workspace packages.
- **`turbo run build`'s own incremental cache** means `build.Dockerfile`'s
  final `RUN` only re-executes work for packages whose inputs actually
  changed since the last build, mirroring exactly what a developer's local
  `pnpm turbo run build` does — this is the concrete resolution of "Docker
  build and local build behave differently."

Practical effect: changing application code in `apps/web` re-runs `build`
and `runtime-next` for `web`, but never re-downloads a single dependency
(`deps` stays cached) and never re-builds `apps/api` or `apps/admin`
unless they actually share changed code with `web` (Turbo's graph decides
that, not this Dockerfile).

---

## 6. Build order

```
base  ──▶  deps  ──▶  build  ──┬──▶  runtime-node  (APP_NAME=api)    ──▶  rmsm/api
                                ├──▶  runtime-next  (APP_NAME=web)    ──▶  rmsm/web
                                └──▶  runtime-next  (APP_NAME=admin)  ──▶  rmsm/admin
```

`base` and `deps` are built once and reused by every downstream stage and
every runtime image — they are not rebuilt per application.
`build` is also built exactly once per pipeline run and fans out to all
three runtime images. Only the runtime stage itself differs per
application, driven entirely by `APP_NAME`/`APP_PORT` build args, not by
a separate Dockerfile per app. `docker-bake.hcl` encodes this exact graph
and lets `docker buildx bake` parallelize independent branches (e.g. the
three runtime images build concurrently once `build` finishes).

---

## 7. Runtime flow

**Node runtime (`runtime-node.Dockerfile`, e.g. `apps/api`):**

```
container start
  -> ENTRYPOINT start-node.sh
      -> validate APP_NAME is set, apps/<app>/dist/main.js exists
      -> export TS_NODE_PROJECT=apps/<app>/tsconfig.json
      -> exec node -r ts-node/register apps/<app>/dist/main.js
          -> apps/api's own bootstrap: packages/config's loadConfig()
             validates process.env (populated by the container's env,
             e.g. Compose env_file / Kubernetes Secret — no .env file
             read at runtime unless one happens to be present)
          -> Nest application starts, binds to APP_PORT
  -> HEALTHCHECK polls GET /health every 30s once the start period elapses
```

**Next runtime (`runtime-next.Dockerfile`, e.g. `apps/web`):**

```
container start
  -> ENTRYPOINT start-next.sh
      -> validate APP_NAME is set, apps/<app>/.next exists
      -> exec node_modules/.bin/next start --prefix apps/<app> -p APP_PORT
  -> HEALTHCHECK polls GET / every 30s once the start period elapses
```

Both entrypoints `exec` into the final process (rather than backgrounding
it under a shell), so the container's PID 1 is the actual Node process —
`docker stop` / a Kubernetes pod termination delivers `SIGTERM` directly
to it, not to a shell wrapper that would otherwise swallow the signal and
force a `SIGKILL` after the grace period.

---

## 8. Validation checklist

This phase was authored and statically reviewed in an environment with no
`docker`/`buildx` binary available (matching the same disclosed limitation
in `docker-compose.prod.yml`'s own header). Everything below was checked
that does not require a Docker daemon; everything after that line still
needs to be run for real before this pipeline is treated as
production-verified.

**Already checked in this phase:**
- [x] Every `*.sh` in `docker/scripts/` passes `bash -n` (syntax-valid).
- [x] `docker-bake.hcl` has balanced braces and a structurally valid
      target/context graph (each `contexts` reference points at a target
      defined in the same file).
- [x] Every Dockerfile's `ARG`/`FROM`/`COPY --from=` chain was traced by
      hand for stage-name and path consistency.
- [x] Confirmed via `grep` that no `packages/*/package.json` declares a
      `"files"` allowlist that could interact unexpectedly with a future
      `pnpm deploy`-based optimization.
- [x] Confirmed `docker-compose.yml`, `docker-compose.prod.yml`, and all
      three existing `apps/*/Dockerfile` are byte-for-byte unchanged.

**Needs a real Docker daemon (BuildKit-enabled, `docker buildx` available):**
- [ ] `docker build -f docker/base.Dockerfile -t rmsm/base:latest .` succeeds.
- [ ] `docker build -f docker/deps.Dockerfile ... .` succeeds and, on a
      second run with no lockfile change, reuses the cache mount (near-instant).
- [ ] `docker build -f docker/build.Dockerfile ... .` succeeds; confirm
      `apps/api/dist`, `apps/web/.next`, `apps/admin/.next` all exist inside
      the resulting image (`docker run --rm rmsm/build:latest ls apps/api/dist apps/web/.next apps/admin/.next`).
- [ ] `docker build -f docker/runtime-node.Dockerfile --build-arg APP_NAME=api ...`
      succeeds; `docker run -p 3001:3001 --env-file .env rmsm/api:latest`
      reaches a healthy `/health` response.
- [ ] Same for `runtime-next.Dockerfile` with `APP_NAME=web` and `APP_NAME=admin`.
- [ ] `docker buildx bake -f docker/docker-bake.hcl` builds the full graph
      in one command on a `docker-container` builder.
- [ ] Compare a `runtime-node`-built `rmsm/api` image's behavior against
      the current `apps/api/Dockerfile`'s `production` target side by side
      (same `.env`, same Postgres/Redis) to confirm true backward
      compatibility before any Phase 2 compose cutover.
- [ ] `hadolint` (or equivalent) against all five Dockerfiles, if available
      in the target CI environment — not available in the environment this
      phase was authored in.
