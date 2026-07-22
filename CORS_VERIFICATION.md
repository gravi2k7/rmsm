# CORS_VERIFICATION.md — BVP-003R Task 1 (SEC-001)

## Was the empty allowlist intentional, overridden elsewhere, or a real defect?

**A real production defect**, determined by direct investigation, not assumed:

- Checked `docker-compose.prod.yml` and every other deployment config in the repository for
  anything that might override CORS at a different layer (a reverse proxy config, an nginx
  config, etc.) — none exists. Nothing overrides this.
- The code's own inline comment — `// local: permissive; else: explicit allowlist TBD` —
  confirms this was a *known, deliberately deferred* placeholder from earlier work, not
  something someone believed was already correct.
- It is not an intentional development default in the sense of "safe to ship as-is": a literal
  empty array combined with `credentials: true` means **zero cross-origin requests succeed in
  any non-local environment**, including from the platform's own `apps/web`/`apps/admin`
  frontends, which are cross-origin from the API in any real deployment (different
  ports/subdomains). This isn't a security *posture* issue alone — it would make the
  deployed product **non-functional**.

## What changed

### 1. New environment variable: `CORS_ALLOWED_ORIGINS`

- **Type**: comma-separated list of full origin URLs (e.g.
  `https://app.rmsm.example.com,https://admin.rmsm.example.com`)
- **Required?** No — optional. See "Why not fail-fast?" below.
- **Where**: `packages/config/src/schemas/app.schema.ts`, parsed via the package's existing
  `commaSeparatedList()` utility (already used by `FEATURE_FLAGS`, same parsing behavior).
- **Validation**: in `staging`/`production` (checked via `NODE_ENV`, matching every other
  production-only guard in `env.validator.ts`), a literal `"*"` anywhere in the list — alone or
  mixed in with real origins — fails startup with a descriptive error. `development`/`test`
  are unaffected (local ergonomics preserved, matching this package's existing convention for
  every other production-only guard).

### 2. `apps/api/src/common/cors/resolve-cors-origins.ts` (new file)

A small, pure function, extracted specifically so this fix's actual runtime behavior could be
unit-tested directly rather than only checkable by booting the full application:

```ts
export function resolveCorsOrigins(config): true | string[] {
  if (config.APP_ENV === "local") return true;
  if (config.CORS_ALLOWED_ORIGINS.length > 0) return config.CORS_ALLOWED_ORIGINS;
  return [config.WEB_APP_URL];
}
```

### 3. `apps/api/src/main.ts`

`app.enableCors({ origin: resolveCorsOrigins(config), credentials: true })` — replaces the
previous inline `APP_ENV === "local" ? true : []`.

## Why `WEB_APP_URL` as the fallback, not a fail-fast requirement?

This project's established pattern (Milestone 5.1.1) *does* fail-fast for secrets left at an
insecure, guessable default (`COOKIE_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`, etc.) in
staging/production — because leaving those unset is a **security** risk (a known, public
default value). An empty/missing `CORS_ALLOWED_ORIGINS` is a different kind of problem: it's
a **functional-restrictiveness** problem (the API becomes unreachable from its own frontend),
not a security one — there's no "guessable insecure value" to guard against here, only an
absent one. Failing startup outright for a missing `CORS_ALLOWED_ORIGINS` risks turning "an
operator forgot to set a new env var" into a full outage on upgrade, for no additional security
benefit over a sensible fallback. `WEB_APP_URL` is already a required, `env.validator.ts`
-validated, non-localhost URL in these environments (since Milestone 5.1.1) — using it as the
default keeps the platform functional (reachable from its own real frontend) while remaining
strictly more restrictive than the pre-fix bug's *intended* behavior would have been if it had
actually specified a real allowlist.

## Preserving localhost support for development

Unchanged: `APP_ENV === "local"` still resolves to `origin: true` (fully permissive),
regardless of whether `CORS_ALLOWED_ORIGINS` happens to be set — confirmed by an explicit test
(`"is fully permissive for local even if CORS_ALLOWED_ORIGINS happens to be set"`).

## A pre-existing nuance, not introduced by this fix

`resolveCorsOrigins()`'s local/non-local branch checks `config.APP_ENV` (matching the original
code's own check), while the new wildcard-rejection guard in `env.validator.ts` checks
`config.NODE_ENV` (matching every *other* existing production-only guard in that file).
`APP_ENV` (`local | development | staging | production`) and `NODE_ENV`
(`development | test | staging | production`) are two distinct, deliberately separate fields
in this codebase's existing config model (`app.schema.ts`'s own doc comments name them
separately) — this fix preserves each check against the field it was already using rather than
unifying them, since that unification would be a larger, separate change beyond this task's
scope. Worth knowing: a deployment where `NODE_ENV=production` but `APP_ENV=local` (or the
reverse) would see the two checks disagree — not expected in normal operation (these two fields
are set together in every example config this repository ships), but stated here explicitly
rather than left as a silent trap.

## Required environment variables (documentation deliverable)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `CORS_ALLOWED_ORIGINS` | No | `[]` (triggers the `WEB_APP_URL` fallback in staging/production) | Comma-separated full origin URLs. Must not contain `*` in staging/production — startup fails with a descriptive error if it does. |
| `WEB_APP_URL` | Yes (already required since Milestone 5.1.1) | `http://localhost:3000` in local only | Used as the CORS fallback origin when `CORS_ALLOWED_ORIGINS` is unset in staging/production. |
| `APP_ENV` | Yes (already required) | `local` | `local` → fully permissive CORS; anything else → allowlist-based. |

**Recommended production `.env` value**, given this platform has two real frontends:
```
CORS_ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

## Verification performed

- **Executed**: `packages/config` test suite — 101/101 passing, including 6 new tests
  covering wildcard rejection (alone and mixed with real origins) in both `production` and
  `staging`, explicit-allowlist acceptance, and explicit confirmation that an unset
  `CORS_ALLOWED_ORIGINS` is accepted (not a fail-fast condition).
- **Executed**: `apps/api`'s new `resolveCorsOrigins()` test suite — 7/7 passing, covering
  local (permissive, including when the var happens to be set — still permissive), staging and
  production with an explicit allowlist, and two explicit SEC-001 regression tests asserting
  the fallback is `[WEB_APP_URL]` — never an empty array, and never `true` — for any non-local
  environment.
- **Executed**: full `apps/api` and `packages/config` typecheck — clean (required rebuilding
  `@rmsm/config`'s compiled output, since `apps/api` resolves it via compiled JS as of
  Milestone 5.1.2's workspace packaging — a real, expected step, not a workaround).
- **Unverified** (needs a live server — same standing limitation as every prior BVP pass this
  project): an actual live preflight `OPTIONS` request against a running instance, confirming
  the browser-facing `Access-Control-Allow-Origin` header is set exactly as expected end-to-end.
  The logic that determines that header's value is fully unit-tested (above); the HTTP-layer
  wiring itself (`app.enableCors()` correctly applying whatever `resolveCorsOrigins()` returns)
  is standard, well-established NestJS/`cors` package behavior, not custom code, and was not
  re-verified live in this sandbox.

## Remaining risk

Low. The fix is narrow, fully covered by real executed tests at both the config-validation and
runtime-resolution layers, and does not change local development behavior at all. The one
residual gap is the live-server preflight check noted above — recommended as a quick manual
smoke test (`curl -H "Origin: https://app.example.com" -X OPTIONS ...`) the first time this is
deployed to a real staging environment, not because the logic is in doubt, but because it's the
one layer of this fix that couldn't be exercised in this sandbox at all.
