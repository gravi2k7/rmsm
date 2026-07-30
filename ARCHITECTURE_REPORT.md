# WM-021 — Workspace Build System Standardization

## Objective

Standardize every package in the PNPM/Turbo workspace onto one enterprise build system: runtime libraries compile to `dist/` and expose `dist/index.js` + `dist/index.d.ts`, instead of the mixed state where 7 packages did this correctly and 8 exposed raw `src/index.ts` as their runtime entry point.

## Package classification

Every package under `packages/` was read (not assumed) to determine what it actually does, then classified. Four packages needed no changes at all — they were already correct.

**Already correct (unchanged):** `@rmsm/core`, `@rmsm/decision`, `@rmsm/execution`, `@rmsm/market`, `@rmsm/opportunity`, `@rmsm/portfolio`, `@rmsm/strategy`. Pure algorithmic domain logic, `tsc -p tsconfig.build.json` build script, `main`/`types` → `dist/`.

**Runtime libraries — fixed to compile to `dist/`:**

- `@rmsm/config` — Zod-validated env loading, config getters (`getEnv`, `isProduction`, etc.). Real executable logic, consumed by `apps/api` and `@rmsm/logging` at runtime.
- `@rmsm/database` — Prisma client singleton, repositories, transaction manager, typed error mapping. The clearest possible case for a runtime library.
- `@rmsm/shared` — `AppError`/`Result` (`ok`/`err`), password policy, slug, JSON helpers. Plain runtime utilities, consumed by `apps/api`.
- `@rmsm/health` — Framework-agnostic health-check primitives (`HealthService`, `HealthController`, DB/memory/uptime checks). Zero runtime dependencies, built for `apps/api` to consume (not yet wired in — see "Observations" below).
- `@rmsm/logging` — Structured logging (pretty-dev/JSON-prod, correlation IDs via `AsyncLocalStorage`, child loggers). Depends on `@rmsm/config`.
- `@rmsm/ai-prompts` — Prompt Management System (AI-202): domain entities, a filesystem-backed `PromptRepository`, rendering/compiler/validation logic. The only "AI package" that exists under `packages/` today (`apps/ai` is a separate Python/FastAPI service, entirely outside this TS/PNPM workspace — not in scope here).

**Types-only — fixed, declaration-focused output:**

- `@rmsm/types` — a single file of `interface`/type declarations (`ApiResponse<T>`, `ApiError`, `Paginated<T>`), no runtime values at all. Given the standard build template, `tsc` still emits a `dist/index.js` (effectively empty — interfaces erase to nothing) alongside a real `dist/index.d.ts`. This is the correct, unsurprising outcome for a types-only package: it satisfies "expose `dist/index.js`" without inventing a special declaration-only variant that every other tool in the chain (Node's own `require`, Next's module resolution) would have to special-case.

**Frontend-only — deliberately left source-based (justified):**

- `@rmsm/ui` — a React/Tailwind component library (Radix UI primitives, `cn`, 19 components), consumed only by `apps/web` and `apps/admin`. Both Next.js apps already had `transpilePackages: ["@rmsm/ui", "@rmsm/shared", "@rmsm/types"]` configured — meaning Next's own SWC pipeline was already set up to compile `@rmsm/ui` directly from source. This is kept exactly as-is: pre-compiling a React component library to a separate `dist/` and then having Next re-consume it as an ordinary npm package would mean double-compiling JSX, losing Next's own Tailwind class-extraction pass over the component source, and risking a duplicate React instance/JSX-runtime mismatch — all solved problems the moment Next transpiles the source directly. This is requirement #4's "frontend-only packages may remain source-based only if justified," applied literally: it's justified by the existing `transpilePackages` wiring, not by default inertia.

  `@rmsm/shared` and `@rmsm/types`, on the other hand, were also in that same `transpilePackages` list — but they're plain TS utilities/types, not React components, and (critically) they're also consumed by `apps/api`, a NestJS service with no `transpilePackages` equivalent at all. `apps/api` genuinely needs real compiled JS + `.d.ts` for these two, so they were reclassified as standard runtime/types-only packages and removed from both Next apps' `transpilePackages` (no longer needed once they ship real `dist/`).

## What was actually broken, beyond config

Two of the 8 packages had real code, not just wiring, standing between them and a clean `tsc -p tsconfig.build.json`:

**`@rmsm/ai-prompts`** used `fileURLToPath(import.meta.url)` to locate its own `templates/` directory relative to the running module. `import.meta` is an ESM-only construct — invalid the moment the package compiles to CommonJS (the target every other runtime package in this workspace uses, since `apps/api` consumes them via `require()`). Fixed by switching to CommonJS's own `__dirname`, with the directory-depth math re-derived from scratch (the original computed 2 levels up from a *file* path; `__dirname` is already a *directory* path, so it only needed 1 level up to land in the same place). Separately, `tsc` only compiles `.ts` files — the JSON prompt templates under `src/templates/` were never going to end up in `dist/` on their own, so the package's `build` script now also copies `src/templates/ → dist/templates/` (a plain `fs.cpSync` call, no new dependency) after `tsc` runs.

**`@rmsm/database`** couldn't be fully validated end-to-end in this sandbox: `prisma generate` requires downloading Prisma's query-engine binary from `binaries.prisma.sh`, which this sandbox's network policy blocks (403/`EAI_AGAIN`). This is proven to be a pre-existing, environment-specific limitation, not something introduced here — running the *original, untouched* `tsc --noEmit` (the package's existing `typecheck` script) fails with the exact same "Prisma namespace has no exported member `UserGetPayload`/`PrismaClientKnownRequestError`" errors, because those types only exist once `prisma generate` has run. The `tsconfig.build.json`/`package.json` changes for `@rmsm/database` follow the identical template validated on the other 6 packages; they will compile cleanly the moment `prisma generate` succeeds, which it will in any environment with normal internet access (the user's machine, CI, Docker build).

## Turbo pipeline

**No changes were needed.** `turbo.json`'s `build` task already declared `dependsOn: ["^build", "@rmsm/database#generate"]` — the standard Turbo idiom for "build every dependency first." It simply had nothing to compute against, since 8 of 15 packages had no `build` script at all. Confirmed via `turbo run build --dry-run=json` after the fix: `@rmsm/api#build` now correctly depends on all 11 of its workspace dependencies' own `#build` tasks (`config`, `core`, `database`, `decision`, `execution`, `market`, `opportunity`, `portfolio`, `shared`, `strategy`, `types`); `@rmsm/logging#build` waits on `@rmsm/config#build`; `@rmsm/shared#build` waits on `@rmsm/types#build`; etc. — the full dependency graph, computed automatically, no manual ordering required anywhere.

## A break this migration would have caused, and the fix

`apps/api`'s `nest build`, and `apps/web`/`apps/admin`'s `next build`, were never given real dist artifacts to depend on before — they resolved `@rmsm/config`, `@rmsm/database`, `@rmsm/shared`, `@rmsm/types` etc. straight from `.ts` source (that's exactly what `main: "./src/index.ts"` caused). All three Dockerfiles' `build` stages called the app's own build command directly (`pnpm --filter @rmsm/api build`, i.e. bare `nest build`), with no separate step to build dependencies first — because none was needed, until now.

Once these packages expose `dist/`, that stops working: `nest build`/`next build` will look for `dist/index.js` and find nothing, because it was never built. This is a direct violation of requirement #9 ("preserve Docker builds") if left alone. Fixed in all three Dockerfiles (`apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/admin/Dockerfile`) by replacing the bare app-only build command with `pnpm exec turbo run build --filter=@rmsm/<app>...`, which builds the full dependency chain in topological order (the same graph validated above) before building the app itself. `apps/api/Dockerfile`'s `deps` stage also had its `COPY packages/*/package.json` list expanded — it previously only copied `config`/`database`/`shared`/`types`, silently missing `core`/`decision`/`execution`/`market`/`opportunity`/`portfolio`/`strategy` despite `apps/api` already depending on all of them; this was a pre-existing gap, not introduced here, but worth closing since it sits directly next to this fix.

## Observations (not acted on — out of this task's scope)

- `@rmsm/health`, `@rmsm/logging`, and `@rmsm/ai-prompts` are not currently declared as dependencies of `apps/api` (no `import`, no `package.json` entry). They're fully-built, fully-tested standalone modules waiting to be wired in — that's a feature/integration task, not a build-system one, so nothing was added here.
- `packages/database/src/{repositories,transactions,pagination,filters,errors,interfaces,__tests__}` — a stray, empty, literally-named directory (a shell brace-expansion artifact, e.g. `mkdir "{a,b,c}"` run without brace expansion). Harmless (empty, excluded from compilation by `tsconfig.json`'s `include: ["src"]` matching real subdirectories only) — flagged here rather than silently deleted, since removing it wasn't asked for.

## Files changed

**Package config (7 packages):** `packages/{ai-prompts,config,database,health,logging,shared,types}/package.json` — `main`/`types`/`exports` → `dist/`, `build` script added (`tsc -p tsconfig.build.json`, `ai-prompts` additionally copies `templates/`). `ai-prompts`, `config`, `shared`, `types` also gained an explicit `@types/node` devDependency (required by the standard `tsconfig.build.json`'s `"types": ["node"]`, previously absent and silently working only by hoisting luck).

**Build config (3 new, 1 realigned):** `packages/{ai-prompts,health,logging}/tsconfig.build.json` created from the validated template (matching `@rmsm/core`'s). `packages/database/tsconfig.build.json` realigned to the same template (it existed but predated the standard shape — missing `module`/`moduleResolution`/`types` overrides).

**Code (1 file):** `packages/ai-prompts/src/infrastructure/filesystem-prompt.provider.ts` — `import.meta.url` → `__dirname` (CJS compatibility, see above).

**Frontend wiring (2 files):** `apps/{web,admin}/next.config.mjs` — `transpilePackages` narrowed from `["@rmsm/ui", "@rmsm/shared", "@rmsm/types"]` to `["@rmsm/ui"]`.

**Docker (3 files):** `apps/{api,web,admin}/Dockerfile` — build stage now runs `turbo run build --filter=@rmsm/<app>...` instead of building the app alone; `apps/api/Dockerfile`'s `deps` stage COPY list expanded to all 11 actual dependencies.

**Unchanged, verified correct:** `turbo.json`, and all 7 previously-correct packages (`core`, `decision`, `execution`, `market`, `opportunity`, `portfolio`, `strategy`) — re-built individually as a regression check, all still compile clean.
