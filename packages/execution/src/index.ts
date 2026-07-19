/**
 * @rmsm/execution
 *
 * The Execution Domain: the complete trade execution lifecycle after a
 * decision has been approved — order types (Market/Limit/Stop/Stop
 * Limit), the full order lifecycle (Pending → Submitted → Accepted →
 * Partially Filled → Filled, or Cancelled/Rejected/Expired), partial
 * fills, average fill price, slippage, commission, retry policy,
 * cancellation, and order routing.
 *
 * Pure domain — no infrastructure, no Prisma, no broker implementation,
 * no MT5, no TradingView, no REST, no GraphQL. Depends on `@rmsm/core`
 * and `@rmsm/market` (re-exporting `Price`/`Volume` as this domain's own
 * `Price`/`Quantity` rather than duplicating them). Real broker
 * connectivity and multi-venue routing decisions are reached only
 * through `interfaces/broker.interface.ts` and
 * `interfaces/execution-engine.interface.ts`, implemented entirely
 * outside this package.
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
