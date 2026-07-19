/**
 * @rmsm/decision
 *
 * The Decision Domain: risk validation before execution — Maximum Daily
 * Loss, Maximum Position Size, Exposure Limits, Correlation Check,
 * Margin Check, an approval workflow (Approved/Rejected/Manual
 * Review/Pending), and position size calculation.
 *
 * Pure domain — no infrastructure, no Prisma, no database, no REST, no
 * broker integration. Depends on `@rmsm/core` and `@rmsm/market`
 * (`SymbolCode`) where appropriate. Real account/exposure/correlation
 * data is reached only through `interfaces/risk-engine.interface.ts`,
 * implemented entirely outside this package.
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
