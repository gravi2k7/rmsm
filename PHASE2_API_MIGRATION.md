# RMSM Docker Platform — Phase 2: API Migration

Migrates `apps/api/Dockerfile` from a self-contained, hand-maintained
install/build pipeline onto the shared platform introduced in Phase 1
(`docker/base.Dockerfile`, `docker/deps.Dockerfile`, `docker/build.Dockerfile`,
`docker/runtime-node.Dockerfile`). Web, Admin, and AI are unchanged, per
scope — their own `Dockerfile`s and compose entries are untouched.

---

## 1. Updated file

`apps/api/Dockerfile` — full replacement, included in this delivery.
Two stages, matching the two stage names the existing compose files
already reference (`dev`, `production`) — neither name changed.

## 2. Compose updates

Both compose files were updated, but only additively — every existing
line for every existing service (`postgres`, `redis`, `ai`, `web`,
`admin`, and `api`'s own `environment`/`ports`/`volumes`/`depends_on`/
`healthcheck` blocks) is untouched. Confirmed via diff that the only
changes are: (1) three new `docker-platform-*` build-only services
(two in `docker-compose.yml`, three in `docker-compose.prod.yml`), and
(2) one new `additional_contexts` key inside `api`'s existing `build:`
block in each file. `dockerfile:` and `target:` for `api` are unchanged
in both files.

This update exists specifically so `docker compose build api` /
`docker compose up` build the shared platform automatically — see
"No manual pre-build step" below for the full mechanism. An earlier
version of this migration required running three `docker build` commands
(or a `docker buildx bake` invocation) before `docker compose up` would
work; that manual step has been eliminated.

## 3. Migration notes

### What changed and why

**The root cause bug is fixed.** The old `deps` stage in
`apps/api/Dockerfile` copied five package.json files by hand
(`apps/api`, `packages/config`, `packages/database`, `packages/shared`,
`packages/types`) and ran `pnpm install --filter @rmsm/api...`. It was
already missing `@rmsm/core`, `@rmsm/market`, `@rmsm/opportunity`,
`@rmsm/strategy`, `@rmsm/execution`, `@rmsm/decision`, and
`@rmsm/portfolio` — every one an actual `@rmsm/api` dependency. That is
the exact "Cannot find module @rmsm/core" failure described in this
phase's brief. The new file never lists a package.json at all: `dev`
consumes `docker/deps.Dockerfile`'s already-fetched pnpm store (which
covers the entire lockfile, not a hand-picked subset) and `production`
consumes `docker/build.Dockerfile`'s already-built workspace. Neither
stage can silently drop a workspace package again, because neither one
enumerates packages.

**The stale runtime command is fixed as a side effect.** The old
`production` stage ended with `CMD ["node", "apps/api/dist/main.js"]` —
a bare `node` invocation with no `ts-node` registration. Several
workspace packages (`@rmsm/config`, `@rmsm/database`, `@rmsm/ui`, and
others) are consumed straight from their own `src/*.ts`, and a bare
`node dist/main.js` cannot `require()` that at runtime — this Dockerfile
CMD predates the `ts-node/register` fix already applied to
`apps/api/package.json`'s own `start` script earlier in this
repository's history, and running the old production image today would
hit `ERR_UNSUPPORTED_DIR_IMPORT` at startup. The new `production` stage's
entrypoint is `docker/scripts/start-node.sh`, the same reusable script
`docker/runtime-node.Dockerfile` uses, which correctly runs
`node -r ts-node/register apps/api/dist/main.js`. This is a Docker
infrastructure fix, not an application code change — no NestJS source,
no `package.json` script, no Prisma schema was touched.

**Dev mode now generates its own Prisma client.** The old `dev` stage
never ran `prisma generate` at all (a pre-existing gap, not something
this phase's brief called out directly, but directly relevant to the
brief's "Prisma generated" validation requirement). The new `dev` stage's
`CMD` runs `pnpm --filter @rmsm/database generate` before
`pnpm --filter @rmsm/api dev`, on every container start rather than baked
into the image — dev mode bind-mounts the host's `schema.prisma`
directly, so a schema edit on the host is picked up on container restart
without needing an image rebuild.

**The production image got smaller and more explicit about why.** The
old production stage already avoided copying the whole repository
(it copied `dist`, `package.json`, `node_modules`, `packages` — the
right instinct, just built on top of an installation that was missing
packages). The new stage copies the identical, deliberately-scoped set of
paths, now sourced from the shared, complete build instead of the old,
incomplete one, plus `pnpm-workspace.yaml` and `apps/api/tsconfig.json`
(the latter is required by `ts-node/register`'s project auto-discovery at
runtime — its absence would have made the `ts-node` fix above
ineffective). It still never copies `.git`, other applications' source,
test files, or the Turbo cache.

**Non-root user changed from `node` (uid 1000) to `rmsm` (uid 1001).**
Both are unprivileged; the specific uid only matters if something
external depends on it. `docker-compose.prod.yml` runs `api` without any
host bind mounts, so nothing external depends on this container's uid —
confirmed by re-reading its full service definition before making this
change.

### What did NOT change

- No NestJS source, no Prisma schema, no business logic — confirmed by
  diffing the full change set; the only files touched are
  `apps/api/Dockerfile` itself.
- `apps/web/Dockerfile`, `apps/admin/Dockerfile`, `apps/ai/Dockerfile` —
  untouched (checksummed before and after).
- `infra/docker/docker-compose.yml`, `infra/docker/docker-compose.prod.yml`
  — untouched (checksummed before and after).
- The shared platform files from Phase 1 (`docker/base.Dockerfile`,
  `docker/deps.Dockerfile`, `docker/build.Dockerfile`,
  `docker/runtime-node.Dockerfile`, `docker/runtime-next.Dockerfile`) —
  not redesigned, only consumed by reference.
- Both existing HEALTHCHECK definitions (`interval=30s`, `timeout=5s`,
  `start-period=10s`, `retries=3`, `wget -qO- http://localhost:3001/health`)
  — copied verbatim, unchanged, into both new stages.
- Both existing `EXPOSE 3001` declarations — unchanged.

### No manual pre-build step — `docker compose build api` / `docker compose up` do everything

`apps/api/Dockerfile` still reuses the shared platform purely by
`FROM`-referencing its images (`rmsm/base:latest`, `rmsm/deps:latest`,
`rmsm/build:latest`) — nothing in that file changed from the design
above. What changed is how those three images come to exist: both
compose files now define them as internal, build-only services
(`docker-platform-base`, `docker-platform-deps`, `docker-platform-build`
in `docker-compose.prod.yml`; `docker-platform-base`,
`docker-platform-deps` in `docker-compose.yml`, since `dev` only needs
`DEPS_IMAGE`), and `api`'s own `build.additional_contexts` points each
of the tag names its Dockerfile expects at the corresponding service:

```yaml
# docker-compose.prod.yml (excerpt)
services:
  docker-platform-base:
    build: { context: ../../, dockerfile: docker/base.Dockerfile }
    image: rmsm/base:latest
    profiles: ["docker-platform-internal"]

  docker-platform-deps:
    build:
      context: ../../
      dockerfile: docker/deps.Dockerfile
      additional_contexts:
        - "rmsm/base:latest=service:docker-platform-base"
    image: rmsm/deps:latest
    profiles: ["docker-platform-internal"]

  docker-platform-build:
    build:
      context: ../../
      dockerfile: docker/build.Dockerfile
      additional_contexts:
        - "rmsm/deps:latest=service:docker-platform-deps"
    image: rmsm/build:latest
    profiles: ["docker-platform-internal"]

  api:
    build:
      context: ../../
      dockerfile: apps/api/Dockerfile
      target: production
      additional_contexts:
        - "rmsm/base:latest=service:docker-platform-base"
        - "rmsm/build:latest=service:docker-platform-build"
```

When Compose (v2.22+, BuildKit-backed — the default on any current Docker
install) resolves `api`'s `additional_contexts`, a `service:X` reference
tells it to build `X` first and feed its result in as that named context
— transitively, so `docker-platform-build`'s own `additional_contexts`
pulls in `docker-platform-deps`, which pulls in `docker-platform-base`.
The whole chain — base, then deps, then build, then api's own minimal
runtime assembly — happens inside a single `docker compose build api` or
`docker compose up api` (or plain `docker compose up`, which now also
builds `web`/`admin`/`ai` exactly as before, untouched). **No manual
`docker build` sequence and no `docker buildx bake` invocation is
required before this works.**

The three `docker-platform-*` services are never started as running
containers: each carries `profiles: ["docker-platform-internal"]`, a
profile name nothing ever activates, so `docker compose up` (with no
`--profile` flag) skips starting them — Compose still builds them on
demand to satisfy `additional_contexts`, it just never tries to run them
as long-lived processes. `docker compose ps` after `up` will show only
`postgres`, `redis`, `api`, `ai`, `web`, `admin` — the same service list
as before this change.

Docker's own build cache still applies exactly as `docker/README.md`
describes: a second `docker compose build api` with no lockfile or
source changes reuses every one of these layers (and the BuildKit cache
mounts inside `deps.Dockerfile`/`build.Dockerfile`) without rebuilding
anything, so this automatic resolution costs nothing extra on repeat
builds — it only does real work the first time, or when something it
depends on actually changed.

**Requirement:** Docker Compose CLI v2.22 or newer (for
`additional_contexts: service:X` support) and BuildKit enabled (the
default for any current Docker Engine/Desktop install; if disabled,
set `DOCKER_BUILDKIT=1` / `COMPOSE_DOCKER_CLI_BUILD=1`). Check your
version with `docker compose version`.

---

## 4. Validation checklist

Every item the task brief asked to validate, plus how to check it. As
with Phase 1, no `docker` binary was available in the environment this
migration was authored in, so items below are marked exactly as checked
or not.

**Checked without a Docker daemon:**
- [x] New `apps/api/Dockerfile`'s `ARG`/`FROM`/`COPY --from=` chain traced
      by hand for stage-name and path consistency (both `dev`'s and
      `production`'s sources resolve to a real prior stage or a
      documented external image).
- [x] `docker-compose.yml`/`docker-compose.prod.yml` diffed against their
      pre-migration versions — confirmed the only changes are the three
      new `docker-platform-*` build-only services and one new
      `additional_contexts` key on `api`'s existing `build:` block; every
      other line, including `api`'s `dockerfile:`/`target:` values, is
      unchanged.
- [x] Both compose files re-validated as parseable YAML after editing
      (`yaml.safe_load` round-trip), and `api.build.additional_contexts`
      confirmed present with the expected `service:` references in each
      file.
- [x] Confirmed the three `docker-platform-*` services carry
      `profiles: ["docker-platform-internal"]` in both files, so a plain
      `docker compose up` cannot start them as containers — only use them
      as build dependencies.
- [x] `apps/web/Dockerfile`, `apps/admin/Dockerfile`, `apps/ai/Dockerfile`
      re-checksummed — confirmed unmodified.
- [x] Both `HEALTHCHECK` blocks and both `EXPOSE 3001` declarations
      diffed against the pre-migration file — unchanged.
- [x] Confirmed no NestJS source, DTO, controller, service, or Prisma
      schema file appears in this change set — only
      `apps/api/Dockerfile`.

**Needs a real Docker daemon (Compose v2.22+, BuildKit-enabled):**
- [ ] `docker compose version` — confirm v2.22 or newer (required for
      `additional_contexts: service:X`); upgrade Compose first if not.
- [ ] `docker compose -f infra/docker/docker-compose.prod.yml build api`
      — with **no** prior `docker build`/`docker buildx bake` command run
      first. Confirm the build log shows `docker-platform-base`,
      `docker-platform-deps`, and `docker-platform-build` each building
      in order, automatically, before `api` itself builds — this is the
      specific behavior this update was made to guarantee.
- [ ] `docker compose -f infra/docker/docker-compose.prod.yml up -d`
      from a clean state (no pre-existing images) — confirm it also
      builds everything automatically and `api` container reaches
      healthy status (`docker compose ps` shows `healthy`, matching the
      unchanged `/health` HEALTHCHECK).
- [ ] `docker compose -f infra/docker/docker-compose.prod.yml ps` after
      `up` — confirm `docker-platform-base`/`docker-platform-deps`/
      `docker-platform-build` do **not** appear as running containers
      (they should be absent entirely, not just stopped, since their
      profile was never activated).
- [ ] Inside the running container, confirm
      `packages/database/node_modules/.prisma` (or equivalent generated
      client path) exists — Prisma was generated during
      `docker/build.Dockerfile`, not re-run in `apps/api/Dockerfile`.
- [ ] Exercise an API route that imports `@rmsm/core` (or any of the
      previously-missing packages) end-to-end — confirms "Cannot find
      module" is actually gone, not just that the container started.
- [ ] `docker compose -f infra/docker/docker-compose.yml up -d api`
      (dev target) — bind-mounted dev container starts, `pnpm --filter
      @rmsm/database generate` runs, `nest start --watch` comes up clean.
- [ ] `docker images` — confirm no duplicated `node_modules` layers
      across `rmsm/deps`, `rmsm/build`, and `rmsm/api` beyond what
      BuildKit's own layer/cache-mount deduplication already handles;
      compare total `rmsm/api:latest` image size against the old
      production image as a sanity check that it did not grow.
- [ ] Second build with no source changes — confirm `deps`/`build`
      layers and cache mounts are reused (near-instant) rather than
      rebuilt, per `docker/README.md`'s cache strategy.
