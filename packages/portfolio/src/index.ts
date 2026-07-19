/**
 * @rmsm/portfolio
 *
 * The Portfolio Domain: portfolio state after trades are executed — cash
 * balance, equity, buying power, margin used/available, positions
 * (open/closed, long/short), performance (realized/unrealized P&L, win
 * rate, profit factor, Sharpe ratio, maximum drawdown), and risk
 * (exposure, sector exposure, symbol exposure, maximum portfolio risk).
 *
 * Pure domain — no infrastructure, no Prisma, no REST, no GraphQL.
 * Depends on `@rmsm/core` and `@rmsm/market` (`SymbolCode`) where
 * appropriate. Live pricing is reached only through
 * `interfaces/portfolio-calculator.interface.ts`, implemented entirely
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
