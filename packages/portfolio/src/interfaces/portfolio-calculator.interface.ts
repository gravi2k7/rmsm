import type { SymbolCode } from "@rmsm/market";

/**
 * The port to real-time price data this domain needs to compute
 * unrealized P&L and live equity — implemented entirely outside this
 * package (a real implementation would likely wrap `@rmsm/market`'s own
 * `MarketDataProvider`, but this domain doesn't depend on that directly;
 * it only needs the one number this narrow interface asks for).
 * `PerformanceService`/`RiskMonitorService` are the consumers; neither
 * fetches a live price itself.
 */
export interface PortfolioCalculator {
  getCurrentPrice(symbolCode: SymbolCode): Promise<number>;
}
