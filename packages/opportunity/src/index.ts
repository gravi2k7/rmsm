/**
 * @rmsm/opportunity
 *
 * The Opportunity Domain: trade opportunities generated from strategies —
 * signal generation, signal strength, confidence scoring, market context
 * (trend/volatility/liquidity), and opportunity status
 * (Pending/Confirmed/Expired/Rejected).
 *
 * Pure domain — no infrastructure, no Prisma, no database, no REST, no
 * broker integration. Depends on `@rmsm/core` and `@rmsm/market`
 * (`SymbolCode`) where appropriate. Signal *generation* is reached only
 * through `interfaces/signal-provider.interface.ts`, implemented
 * entirely outside this package — this domain scores and manages the
 * lifecycle of opportunities/signals once generated, it never generates
 * one itself.
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
