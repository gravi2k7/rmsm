/**
 * @rmsm/strategy
 *
 * The Strategy Domain: trading strategies modeled independently from
 * execution — lifecycle (Draft → Testing → Paper Trading → Production →
 * Archived), versioning, parameters, rule composition, risk profile,
 * timeframe, supported symbols, enable/disable, and validation.
 *
 * Pure domain — no infrastructure, no Prisma, no database, no REST, no
 * broker integration. Depends on `@rmsm/core` (Entity/AggregateRoot/
 * ValueObject/Result/DomainError/Guard) and `@rmsm/market` (SymbolCode,
 * Timeframe) where appropriate — never on anything execution-specific.
 * Rule *evaluation* is reached only through `interfaces/
 * strategy-engine.interface.ts`, implemented entirely outside this
 * package.
 */

export * from "./entities";
export * from "./value-objects";
export * from "./events";
export * from "./repositories";
export * from "./services";
export * from "./interfaces";
export * from "./validators";
export * from "./errors";
export * from "./factories";
