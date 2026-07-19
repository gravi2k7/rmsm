/** NestJS can't inject a TypeScript interface directly (it has no
 * runtime representation) — every handler/service in this module
 * depends on `StrategyRepository` (the interface) via this token, never
 * on `InMemoryStrategyRepository` (the concrete class) directly. That's
 * what makes swapping in a future Prisma-backed implementation (see
 * `/apps/api/PERSISTENCE_ROADMAP.md`) a one-line change in this module's
 * own provider registration, not a change to every handler that uses it. */
export const STRATEGY_REPOSITORY = Symbol("STRATEGY_REPOSITORY");
