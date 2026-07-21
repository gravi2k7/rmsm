# docker

Dockerfiles and docker-compose definitions for local development and production.

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
this sandbox), or `docker-compose.prod.yml` beyond YAML-syntax validation. Confirm these with a
real `docker build` and `docker compose -f docker-compose.prod.yml up` before relying on this
in an actual deployment.

## Kubernetes / Terraform

See `infra/kubernetes/README.md` and `infra/terraform/README.md` — out of scope for this
milestone.
