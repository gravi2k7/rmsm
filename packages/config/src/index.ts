/**
 * Public API of `@rmsm/config`. Re-exports the package's six-domain
 * modular structure (`env/`, `config/`, `schemas/`, `utils/`, `types/`)
 * in full — this file previously only re-exported the older flat
 * `env.schema.ts` (`envSchema`, `Env`, `loadConfig`), which predates
 * that restructuring and was never updated once it landed, leaving
 * `resetConfigCache`, `getEnv`, `isProduction`/`isTest`/`isDevelopment`/
 * `isStaging`, `ConfigValidationError`, and every domain-scoped
 * `config/*.config.ts` getter unreachable from outside this package
 * despite `apps/api` and `@rmsm/logging` already being written against
 * them. `env.schema.ts` and its now-superseded test were removed as
 * part of this fix — `env/env.validator.ts` is the same schema
 * (byte-for-byte compatible `Env` shape, per its own doc comment), so
 * keeping both around would mean two conflicting exports named
 * `envSchema`/`Env`, not two valid options.
 *
 * Deliberately NOT exported: `errors/config-validation.error.ts` — an
 * orphaned, unused duplicate of `types/config.types.ts`'s
 * `ConfigValidationError` (different constructor signature, zero
 * importers anywhere in the repo). Left in place rather than deleted,
 * since removing it isn't required to fix anything reported here, but
 * excluded from the public API so it can never be the one that
 * accidentally gets imported.
 */
export * from "./env";
export * from "./config";
export * from "./schemas";
export * from "./utils";
export * from "./types";
