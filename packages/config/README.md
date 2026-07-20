# config

Enterprise configuration framework for RMSM AI: Zod-validated, strongly-typed, environment-aware,
and organized by domain.

## Layout

```
src/
  config/       Nested, strongly-typed getters per domain (getAppConfig, getDatabaseConfig, ...)
  env/          env.loader.ts (loadConfig/getEnv), env.parser.ts (reusable Zod coercion helpers),
                env.validator.ts (the merged root schema + fail-fast validateEnv)
  schemas/      One Zod schema per domain (app, database, auth, logging, ai, market)
  types/        Cross-cutting types (Environment, FeatureFlags, ConfigValidationError)
  utils/        config.helper.ts — isProduction/isDevelopment/isTest/isStaging, feature-flag helpers
  __tests__/    Valid config, invalid values, missing required vars, defaults, feature flags
```

## Two ways to consume it

**1. Flat access** — every existing caller in `apps/api` uses this today, unchanged:

```ts
import { loadConfig } from "@rmsm/config";
const config = loadConfig();
config.DATABASE_URL; // flat, same field names as the original envSchema
```

**2. Domain-scoped access** — a nested, strongly-typed view organized by concern:

```ts
import { getAuthConfig } from "@rmsm/config";
const auth = getAuthConfig();
auth.jwt.accessSecret; // same underlying validated value, nested under its domain
```

Both read from the exact same validated, memoized `Env` — there's only one source of truth.

## Environments

`NODE_ENV`: `development` | `test` | `staging` | `production` (drives `isProduction()` etc.).
`APP_ENV`: `local` | `development` | `staging` | `production` — a second, finer-grained dimension
(e.g. distinguishing a developer's own machine from a shared "development" deployment, both of
which are `NODE_ENV=development`).

## Feature flags

`FEATURE_FLAGS=new-dashboard,beta-search` (comma-separated) becomes `AppConfig.featureFlags`, a
frozen `{ [name]: true }` map — check with `isFeatureEnabled(flags, "new-dashboard")`. A flag
doesn't need to be pre-declared anywhere; any name not present in the map is simply off.

## Design principles

- **Zod validation, fail-fast.** `validateEnv()` throws a `ConfigValidationError` listing every
  invalid/missing field, formatted and ready to read from a boot log — never a silent default
  masking a misconfigured deployment.
- **Dependency-free except Zod.** No dependency on `@rmsm/core`/`@rmsm/shared`/anything else.
- **Backward compatible.** The flat `Env` type and `loadConfig()` are byte-for-byte compatible
  with the package's original shape — every pre-existing field, validator, and default is
  unchanged. New fields (`FEATURE_FLAGS`, `LOG_LEVEL`, `LOG_FORMAT`, the `market` domain) are
  purely additive.
- **Honest domain boundaries.** Billing/notifications/strategy-engine-outbox env vars predate this
  restructuring and don't map cleanly onto `app`/`database`/`auth`/`logging`/`ai`/`market` — see
  `env/env.validator.ts`'s own `platformIntegrationsSchema` comment rather than being force-fit
  into a domain they don't belong to. `market.schema.ts` is genuinely new, forward-looking
  configuration with no reader in `apps/api` yet (documented there) — AI-101's actual per-provider
  credentials remain database-stored, per-organization data, not environment config.

## Production/staging insecure-default guard (Milestone 5.1.1)

Several fields — `COOKIE_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY`,
`NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY`, `MOCK_WEBHOOK_SECRET` — have predictable, publicly
known default values so local development works with zero setup. `envSchema` (`env/env.validator.ts`)
now refuses to validate when `NODE_ENV` is `staging` or `production` and any of these still hold
that default, or when `WEB_APP_URL` is still pointed at `localhost`. `development` and `test` are
unaffected — local ergonomics are unchanged.

This is a hand-maintained list of exact known values, not a heuristic ("looks like a default") —
a real operator-chosen secret that happens to resemble the dev default in shape is never rejected,
only the literal dev value itself is. Every offending field is reported in one pass (via Zod's
`superRefine`), consistent with `validateEnv()`'s existing "list every issue, not just the first"
philosophy — see `env/env.validator.ts` for the full list and remediation hints, and
`.env.example` for what each of these needs to become before a staging/production deploy.
