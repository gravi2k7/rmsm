/**
 * @rmsm/config
 *
 * Enterprise configuration framework for RMSM AI: Zod-validated,
 * strongly-typed, environment-aware, and organized by domain.
 *
 * Two ways to consume it:
 *
 * 1. **Backward-compatible flat access** (every existing caller in
 *    `apps/api` uses this today, unchanged):
 *    ```ts
 *    import { loadConfig } from "@rmsm/config";
 *    const config = loadConfig();
 *    config.DATABASE_URL; // flat, same field names as always
 *    ```
 *
 * 2. **New domain-scoped access**, for code that wants a nested,
 *    strongly-typed view organized by concern instead of one flat object:
 *    ```ts
 *    import { getAuthConfig } from "@rmsm/config";
 *    const auth = getAuthConfig();
 *    auth.jwt.accessSecret; // same underlying validated value
 *    ```
 *
 * Both read from the exact same validated, memoized `Env` — there's only
 * ever one source of truth, `loadConfig()`'s own cache.
 */

export * from "./env";
export * from "./config";
export * from "./schemas";
export * from "./types";
export * from "./utils";
