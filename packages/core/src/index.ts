/**
 * @rmsm/core
 *
 * The platform's shared domain kernel — framework-agnostic DDD building
 * blocks (Entity, AggregateRoot, ValueObject, DomainError, Result,
 * DomainEvent, Guard, Repository/Clock/IdGenerator contracts, CQRS handler
 * contracts, the Specification pattern) that every future domain module
 * (Strategy, Scanner, Alerts, Backtesting, Portfolio, AI Analysis, ...) can
 * build on instead of redefining its own copy.
 *
 * Deliberately has zero runtime dependencies, including on other `@rmsm/*`
 * packages — the same "dependency-free shared kernel" discipline
 * `@rmsm/shared`'s own `json.ts` documents for why it doesn't depend on
 * `@prisma/client`, taken one level further here: nothing should have to
 * depend on anything to depend on `@rmsm/core`.
 *
 * This package contains no business logic and models no domain concept —
 * no Market, Strategy, Decision, Execution, or Portfolio class exists
 * here. It is the foundation those future modules are built on top of,
 * not a preview of what they'll contain.
 */

export * from "./contracts";
export * from "./entities";
export * from "./enums";
export * from "./errors";
export * from "./events";
export * from "./interfaces";
export * from "./results";
export * from "./value-objects";
export * from "./validators";
export * from "./utils";
