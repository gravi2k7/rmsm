# docker

Dockerfiles and docker-compose definitions for local development and production.

## Workspace packaging (superseding update)

The 11 runtime workspace packages (`@rmsm/core`, `config`, `database`, `shared`, `types`,
`market`, `strategy`, `opportunity`, `decision`, `execution`, `portfolio`) now have real
`build` scripts (`tsc -p tsconfig.build.json`) producing compiled CommonJS in `dist/`, with
`package.json`'s `main`/`types`/`exports` pointing there instead of raw `.ts` source. This
**retires the `tsx` runtime-loader workaround** documented in bug #7/#8 below: `apps/api`'s
production image no longer needs it (or any TypeScript runtime tooling) at all — every
`require("@rmsm/config")` now resolves to real, already-compiled JavaScript. See
`packages/config/tsconfig.build.json` for the pattern (same across all 11), and the bug list
below for the full history of why this was needed and what was tried first.

`@rmsm/ui` is deliberately excluded from this — it remains TS-source-only by design, consumed
directly via `next.config.mjs`'s `transpilePackages` by both `apps/web` (React 18) and
`apps/admin` (React 19), which each need to transpile it against their own React version. See
that package's own notes.

## Development vs. production — do not confuse the two compose files (Milestone 5.1.3)

`docker-compose.yml` (this directory) is **local development only** — every service builds its
Dockerfile's `dev` target and bind-mounts source for hot reload. `apps/api`'s `dev` target
correctly runs `nest start --watch`, which needs `@nestjs/cli` (a devDependency, present in
that target, correctly absent from `production`). Running this file and describing the result
as "the production container" produced a real support report (`nest start --watch` is indeed
wrong for production) with the wrong diagnosis (the *actual* production path —
`docker-compose.prod.yml`'s `production` target — was already correct and unaffected). A clear
header comment now lives at the top of `docker-compose.yml` itself to prevent this recurring.

A second, real, separate bug was found alongside it: `docker-compose.yml`'s bind mount
(`../../:/workspace`) replaces the container's entire `/workspace` with the host's checkout,
which would shadow every `node_modules` directory `docker build` produced — the file only
protected the workspace-root `node_modules` with an anonymous volume, not the *nested*
`node_modules` folders pnpm's non-hoisting linker actually uses for a package's own direct
dependencies (the same category of issue as every `tsx`/`@rmsm/*` bug found during Milestones
5.1.1–5.1.2 — see the bug list further down). `@nestjs/cli` lives only at
`apps/api/node_modules/@nestjs/cli`, confirmed directly — never at the workspace root — so it
was never protected, and a fresh `docker compose up` could fail with exactly the reported
`Cannot find module '.../nest.js'` if the host's own local `apps/api/node_modules` didn't
happen to already have it. Fixed by adding an anonymous volume for every nested `node_modules`
each dev service actually needs (`api`, `web`, `admin` — see each service's own comment in
`docker-compose.yml`).

## Files

- `docker-compose.yml` — local development stack. Every app service builds its Dockerfile's
  `dev` target, bind-mounts source for hot reload, and uses dev-friendly defaults.
- `docker-compose.prod.yml` — production stack (Milestone 5.1.2). Every app service builds its
  Dockerfile's `production` target instead: no bind mounts, no source in the image, secrets
  sourced from the environment (not checked-in defaults), restart policies set.
- `apps/{api,web,admin,ai}/Dockerfile` — each is multi-stage: `base` → `deps` → `dev` /
  `build` → `production`. Only the `production` stage ships to a real deployment.

## Running production locally (for validation before a real deploy)

```bash
# From the repo root, with every required var set (see docker-compose.prod.yml's own
# comments for the full list — POSTGRES_USER/PASSWORD, JWT_ACCESS_SECRET/JWT_REFRESH_SECRET,
# COOKIE_SECRET, TWO_FACTOR_ENCRYPTION_KEY, NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY,
# MOCK_WEBHOOK_SECRET, WEB_APP_URL, NEXT_PUBLIC_API_URL):
docker compose -f infra/docker/docker-compose.prod.yml --env-file .env.production up --build
```

apps/api will refuse to start if any of the secrets above are missing or left at a known
dev-only default — this is Milestone 5.1.1's fail-fast production validation
(`packages/config/src/env/env.validator.ts`), not a bug in the compose file.

## Production hardening (Milestone 5.1.2)

Every service's `production` stage:

- **Runs as a non-root user.** `apps/api` uses the `node` image's built-in `node` user;
  `apps/web`/`apps/admin` do the same via Next's own standalone output convention.
- **Ships no development dependencies.** `apps/api` installs production dependencies in a
  dedicated `prod-deps` stage (`pnpm install --prod`), separate from the `deps` stage `dev`/
  `build` use — no jest/eslint/typescript/ts-jest/@types/\* reach the final image.
  `apps/web`/`apps/admin` use Next's `output: "standalone"` build mode
  (`next.config.mjs`), which traces only the actually-imported production dependency subset —
  verified directly this milestone: standalone output was ~570 MB vs. the full monorepo's
  ~3.1 GB `node_modules`.
- **Has a HEALTHCHECK.** Each app exposes `GET /health` (api) or `GET /api/health`
  (web/admin), checked via `wget` (already present in `node:20-alpine`, no extra install).
- **Forwards signals correctly via `tini`.** Node running directly as container PID 1 does not
  reliably receive/forward SIGTERM the way a normal process does, and doesn't reap zombie
  processes. `tini` (`apk add tini`, ~10 KB, no extra libraries) is set as each production
  image's `ENTRYPOINT`, ahead of the real `CMD`.
- **Enables graceful shutdown at the application level.**
  `apps/api/src/main.ts` now calls `app.enableShutdownHooks()` — without this, NestJS's
  `OnModuleDestroy` lifecycle hooks never fire on SIGTERM, which mattered concretely here:
  `OutboxPublisherService`'s polling interval (and `IndicatorLifecycleService`'s own cleanup)
  would otherwise keep the process alive past a `docker stop`, until Docker's force-kill
  timeout. `apps/web`/`apps/admin` need no equivalent change — Next's own standalone
  `server.js` already handles SIGTERM.

### Real bugs found and fixed this milestone (not hypothetical — see below for how each was verified)

1. **`apps/api/Dockerfile`'s `deps` stage copied only 4 of apps/api's 11 workspace-package
   `package.json` files.** `pnpm install --filter @rmsm/api...` needs the complete workspace
   picture to resolve correctly; the missing 7 (`core`, `market`, `strategy`, `opportunity`,
   `decision`, `execution`, `portfolio`) are real, direct dependencies. Fixed by copying all 11.
2. **The compiled entry point was at the wrong path.** `apps/api/package.json`'s `start` script
   and the Dockerfile's `CMD` both assumed `dist/main.js`; `nest build`'s actual tsc output
   (no explicit `rootDir` in `apps/api/tsconfig.json`) is `dist/src/main.js`. Confirmed by
   actually running the compiled output and reading the `MODULE_NOT_FOUND` error. Fixed in both
   the npm script and the Dockerfile `CMD`.
3. **`apps/api`'s workspace packages cannot be `require()`'d as compiled JS at all.** Every
   `@rmsm/*` package apps/api depends on is TS-source-only (`"main": "./src/index.ts"`, no
   `build` script — an existing, deliberate characteristic of this monorepo, not something
   this milestone changed; see `packages/config/README.md`). Running `node dist/src/main.js`
   directly throws `ERR_UNSUPPORTED_DIR_IMPORT` trying to resolve `@rmsm/config`. Fixed by
   adding `tsx` (a minimal TS loader) as a real production dependency of `apps/api` and
   invoking it via `node -r tsx/cjs dist/src/main.js` — a deliberate, narrow exception to
   "remove unnecessary runtime tooling" (Objective 8): without it, the image cannot start at
   all. Two more "architecturally pure" alternatives were considered and not attempted this
   milestone: adding a real `tsc` build step to all 11 packages (would require changing every
   package's `main` field, which breaks the zero-build-step `ts-jest`/`vitest` test flow every
   package currently relies on — a materially bigger change than this milestone's scope), and
   a `nest build --webpack` bundle (would need a new webpack dependency and a hand-written
   config with correct `externals` handling, unverifiable end-to-end without a real Docker
   build in the environment this was authored in).
4. **A real NestJS dependency-injection bug, unrelated to Docker, that prevented the app from
   booting in *any* environment.** `OutboxPublisherService`'s optional `config?: Env`
   constructor parameter had no injection token, so Nest's DI container threw "can't resolve
   dependencies" and refused to instantiate the provider — found only because this milestone
   actually ran the compiled application end-to-end for the first time (existing tests
   construct this service directly with `new`, bypassing Nest's DI container entirely, so
   they never exercised this path). Fixed with `@Optional() @Inject(APP_CONFIG)`.
5. **`apps/admin/Dockerfile`'s production `CMD` never passed a port.** `next start` with no
   `-p`/`PORT` defaults to Next's own default, 3000 — while `EXPOSE`d 3000 too, the
   `HEALTHCHECK` (correctly) checked `:3002`, admin's real configured port. The healthcheck
   would never have passed. Fixed by setting `PORT=3002` (Next's standalone `server.js` reads
   it directly).
6. **Both `apps/web/Dockerfile` and `apps/admin/Dockerfile` had a `COPY ... public
   ./apps/*/public` step, but neither app has a `public/` directory.** A Docker `COPY` of a
   nonexistent source path fails the build outright — this was a latent, pre-existing bug.
   Removed, with a comment for when a `public/` directory is eventually added.
7. **`apps/api/Dockerfile`'s production stage never copied `apps/api/node_modules`, and even
   after fixing that, `-r tsx/cjs` still failed with `Error: Cannot find module 'tsx/cjs'`.**
   Reported against an actual built image. Two distinct causes, found and fixed in sequence:
   - **Cause 1**: the production stage copied the workspace-root `node_modules` and
     `apps/api/dist`/`package.json`, but never `apps/api/node_modules` itself. Confirmed
     directly (`ls node_modules/tsx` at the workspace root: not found; `ls
     apps/api/node_modules/tsx`: a real symlink into the shared `.pnpm` store): pnpm's default
     node-linker does not hoist a workspace package's own direct dependencies to the workspace
     root — every one of them (not just `tsx`; `@nestjs/common`, `winston`, everything in
     `apps/api/package.json`'s `dependencies`) is symlinked *only* inside that package's own
     `node_modules` folder. Fixed by adding `COPY --from=prod-deps
     /workspace/apps/api/node_modules ./apps/api/node_modules`.
   - **Cause 2** (found only after Cause 1's fix was verified against a real build — the file
     now existed in the image, but Node still couldn't find it): Node's `-r`/`--require` flag
     resolves its module specifier starting from `process.cwd()` and walks *upward* through
     ancestor `node_modules` directories only (confirmed directly:
     `Module._nodeModulePaths(cwd)` never returns a descendant path) — unlike an ordinary
     in-code `require()` call, which resolves relative to the requiring file's own `__dirname`.
     With `WORKDIR /workspace` and `CMD ["node", "-r", "tsx/cjs", "apps/api/dist/src/main.js"]`,
     `-r`'s resolution checked `/workspace/node_modules/tsx` (doesn't exist there — see Cause 1)
     and had no way to reach `/workspace/apps/api/node_modules/tsx`, a *descendant* of CWD, not
     an ancestor — copying the file there (Cause 1's fix) was necessary but not sufficient.
     Fixed by adding `WORKDIR /workspace/apps/api` after the `COPY` instructions (so it's active
     only for `CMD`/`ENTRYPOINT`, not the preceding copies) and changing `CMD`'s script path
     from `apps/api/dist/src/main.js` to `dist/src/main.js` to match. Every other `require()`
     call in `apps/api/dist` was already resolving correctly regardless of CWD, via
     `__dirname`-relative walking — only the `-r` flag's own, differently-anchored resolution
     needed this.

   Verified both fixes by replicating the exact post-fix `COPY` structure *and* CWD outside
   Docker (`cp` preserves symlinks the same way Docker's `COPY` does; this sandbox still has no
   `docker` binary) and confirming the app resolves every dependency and reaches real runtime
   code (module instantiation, config validation, Redis connection attempts) rather than
   failing at module resolution.
8. **`apps/api/Dockerfile`'s production stage copied `packages` (every `@rmsm/*` workspace
   package) from the `prod-deps` stage, not `build`.** Reported as `Cannot find module
   '@rmsm/config'` against a real build, immediately after Cause 2 above was fixed and
   confirmed. Root cause: `prod-deps` (see its own comment in the Dockerfile) is deliberately
   built from *only* `package.json` files, copied before any source, so its `pnpm install
   --prod` layer caches independently of source changes — it never receives
   `packages/*/src`. Copying `packages` from that stage put a real, resolvable directory at
   e.g. `/workspace/packages/config` in the final image, but one containing only
   `package.json` — no `src/index.ts`. Requiring `@rmsm/config` followed the (correctly
   copied) `apps/api/node_modules/@rmsm/config` symlink to that directory, read its
   `package.json`'s `"main": "./src/index.ts"`, and failed to find that file, because it was
   never there. Fixed by sourcing `packages` from `build` (which has the full source tree via
   `COPY . .`) instead. This does let each package's own `node_modules` (their own resolved
   dependencies, not `apps/api`'s) come from the non-prod-only `build` stage too — verified
   this doesn't meaningfully reintroduce devDependency bloat: those are themselves just
   symlinks into the shared `.pnpm` store, which still comes from `prod-deps` separately, so a
   devDependency-only symlink (e.g. into `vitest`) simply dangles, harmlessly, at negligible
   size, while every real production dependency resolves correctly through the prod-only store.
   Verified by replicating the corrected structure outside Docker and confirming `@rmsm/config`
   and `@rmsm/database` both resolve to real source and the app reaches all the way into
   `@prisma/client`'s own internal initialization — the only remaining failure was an artifact
   of this sandbox's Prisma-stub testing methodology (see `PERSISTENCE_ROADMAP.md`/earlier
   milestones), not the Dockerfile.

### How this was verified without a `docker` binary

This milestone was implemented in a sandbox with no `docker` CLI at all — every claim above
about an actual container build/run is **not** independently confirmed via `docker build`/
`docker run`. What *was* genuinely verified, directly, without Docker:

- `pnpm --filter @rmsm/api build` (real `nest build`) followed by actually running
  `node -r tsx/cjs dist/src/main.js` with a real, invalid-for-production env: correctly
  resolved every workspace package (previously failed with `ERR_UNSUPPORTED_DIR_IMPORT`),
  correctly hit Milestone 5.1.1's fail-fast config guard, exited with code 1, and — sent
  `SIGTERM` mid-startup — exited cleanly rather than hanging.
- The same, with a fully valid production-shaped env: got past config validation and all
  module instantiation (including the fixed `OutboxPublisherService`), failing only on a real
  `ECONNREFUSED` to Redis — because no Redis server exists in this sandbox, a genuine
  infrastructure limitation, not a code issue. `SIGTERM` still exited the process cleanly.
- `pnpm --filter @rmsm/web build` / `pnpm --filter @rmsm/admin build` with `output:
  "standalone"`: real build succeeds; running the resulting `apps/{web,admin}/server.js`
  directly served a real `HTTP 200` on `/login` and exited cleanly on `SIGTERM`, including
  confirming `PORT=3002` correctly rebinds admin's standalone server off Next's 3000 default.

**Not verified**: an actual `docker build`, an actual running container, a `HEALTHCHECK`
passing inside a real container, the `tini`/non-root/`apk` steps (Alpine-specific, can't run in
this sandbox), or `docker-compose.prod.yml` beyond the checks below. Confirm these with a real
`docker build` and `docker compose -f docker-compose.prod.yml up` before relying on this in an
actual deployment.

### `docker-compose.prod.yml` validation

No `docker` binary is available in this sandbox, so `docker compose config` (the authoritative
check) has not been run. `infra/docker/validate-compose.py` (stdlib + PyYAML only) is a
structural stand-in: valid YAML, the expected six services present, declared volumes match what
services reference, every `${...}` interpolation is well-formed, and no corrupted variable names
(the file was hardened and re-verified against exactly this class of issue after a report of
YAML corruption in a delivered copy that could not be reproduced against this file directly).
Run it with:

```bash
python3 infra/docker/validate-compose.py
```

Treat a clean run of this script as "no obvious structural corruption," not as "verified
correct" — run the real `docker compose config` whenever Docker is available, and prefer its
output if the two ever disagree.

## Kubernetes / Terraform

See `infra/kubernetes/README.md` and `infra/terraform/README.md` — out of scope for this
milestone.
