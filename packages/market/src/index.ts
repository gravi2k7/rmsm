/**
 * @rmsm/market
 *
 * The Enterprise Market Domain: pure DDD domain modeling for market data
 * across every supported asset class (Forex, Futures, Equities, Indices,
 * Crypto, Commodities, Options, Bonds, ETFs) — exchanges, symbols,
 * sessions, trading calendars, candles, ticks, and quotes.
 *
 * Pure domain — no infrastructure. No Prisma, no database
 * implementation, no REST, no GraphQL, no broker/MT5/TradingView
 * integration. Every persistence need is expressed as a repository
 * *interface* (`repositories/`) and every external data need as a
 * provider *interface* (`interfaces/`) — concrete implementations of
 * both belong entirely outside this package, in whatever infrastructure
 * layer eventually consumes it.
 *
 * Builds on `@rmsm/core`: `Entity`/`AggregateRoot` for identity and
 * domain events, `ValueObject` for immutable value types, `Result`/`ok`/
 * `err` for explicit, non-throwing error handling at every domain-object
 * construction boundary, `DomainError` as the base of this package's own
 * `MarketDomainError` hierarchy, and `Guard` for construction-time
 * invariant checks.
 */

export * from "./entities";
export * from "./value-objects";
export * from "./events";
export * from "./repositories";
export * from "./services";
export * from "./interfaces";
export * from "./types";
export * from "./enums";
export * from "./validators";
export * from "./errors";
export * from "./factories";
