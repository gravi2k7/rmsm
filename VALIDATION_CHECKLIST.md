# WM-021 — Validation Checklist

Run from the repo root after extracting this zip's contents into place.

## 1. Apply

Extract this zip's `packages/` and `apps/` contents into your project at `C:\Ravi\RMSM_Project\rmsm\`, overwriting the listed files (no deletions — every change is additive/edited, nothing was removed).

## 2. Install

```
pnpm install
```
New devDependency added to 4 packages (`ai-prompts`, `config`, `shared`, `types`): `@types/node@^20.14.15`, required by the standard `tsconfig.build.json` template's `"types": ["node"]`. `pnpm install` will pick this up from the updated `package.json` files; no lockfile surgery needed since the version pins an already-used range.

## 3. Build

```
pnpm build
```
This now actually builds all 15 packages (previously only 7 did). Expected order (Turbo computes this automatically): `types` → `shared`/`config` → `logging` → `core` → `database`/`market` → `decision`/`opportunity`/`strategy` → `execution`/`portfolio`, with `health`, `ai-prompts`, `ui` (source-based) building independently. `apps/api`, `apps/web`, `apps/admin` build last, after all their dependencies.

**What was and wasn't validated in the sandbox this was built in:**

| Area | Status |
|---|---|
| 7 previously-correct packages (`core`, `decision`, `execution`, `market`, `opportunity`, `portfolio`, `strategy`) | Rebuilt individually — clean, no regression |
| 6 of 7 fixed packages (`types`, `shared`, `config`, `logging`, `health`, `ai-prompts`) | Built individually — clean, zero errors |
| `@rmsm/database` | **Not buildable in this sandbox** — `prisma generate` needs `binaries.prisma.sh`, blocked by this sandbox's network policy. Proven pre-existing (see report): the untouched `tsc --noEmit` fails identically. Will build cleanly wherever `prisma generate` can actually run — which is everywhere except this sandbox. |
| `apps/api` build | Blocked transitively by `@rmsm/database`, same reason |
| `apps/web`/`apps/admin` typecheck (`tsc --noEmit`) | Clean, validates the new `@rmsm/shared`/`@rmsm/types` dist resolution at the type level |
| `apps/web`/`apps/admin` module resolution | Verified directly via `require.resolve()` — `@rmsm/shared`/`@rmsm/types` resolve to `dist/index.js`, `@rmsm/ui` still resolves to `src/index.ts` (correct, by design) |
| `apps/web`/`apps/admin` full `next build` | Not completed in this sandbox — production builds run long enough to exceed this sandbox's per-command time limit. The specific mechanism the migration changes (module resolution of `@rmsm/shared`/`@rmsm/types`) was validated directly instead (above); nothing else about `next build` was touched. |
| `turbo run build --dry-run` | Confirms the full topological graph is correct (see report) |

Run `pnpm build` on your own machine to get the full, real result — it should be a clean, complete pass everywhere the sandbox above couldn't reach.

## 4. Lint

```
pnpm lint
```
Verified individually on all 6 buildable fixed packages: clean. Not run for `database` (see above) or full-repo (sandbox time constraints) — no reason to expect a different result, since lint doesn't depend on the build changes made here.

## 5. Typecheck

```
pnpm typecheck
```
Same caveat as build: `@rmsm/database` (and transitively `apps/api`) will fail in *this* sandbox specifically on the pre-existing Prisma-generation gap, not on anything from this migration.

## 6. Test

```
pnpm test
```
Verified individually: `ai-prompts` (63 tests), `shared` (15), `config` (106), `logging` (62), `health` (46) — all passing, zero regressions. `apps/web`'s `signup` test suite (12 tests) re-run as an integration check against the new `@rmsm/shared`/`@rmsm/types` — passing.

## 7. API starts successfully

Not verifiable in this sandbox (blocked transitively by the same Prisma network restriction — `apps/api` depends on `@rmsm/database`). Once `pnpm build` succeeds on your machine, `node apps/api/dist/main.js` should start normally; nothing about the app's own startup path was changed, only how its workspace dependencies get compiled.

## 8. No runtime package exposes `src/index.ts`

```
grep -r '"main": "./src' packages/*/package.json
```
Should return nothing except `packages/ui/package.json` (intentional — see report's "frontend-only, justified" section).

## Docker

`apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/admin/Dockerfile` were all updated (their `build` stage now runs `turbo run build --filter=@rmsm/<app>...` instead of building the app alone) — this sandbox has no Docker daemon, so these couldn't be exercised with an actual `docker build`. Traced through line-by-line against the new dependency requirements instead; see the report's "A break this migration would have caused, and the fix" section for the full reasoning. Recommend a real `docker build` on your end as the final check on this specific piece.
