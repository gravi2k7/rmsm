import type { SymbolCode } from "@rmsm/market";

export interface AccountSnapshot {
  readonly equity: number;
  readonly usedMargin: number;
  readonly availableMargin: number;
  readonly dailyPnL: number;
  readonly openPositionCount: number;
}

/**
 * The port to real account/exposure/correlation data this domain needs
 * to actually run its own risk checks (Maximum Daily Loss, Exposure
 * Limits, Correlation Check, Margin Check) — implemented entirely
 * outside this package, since it requires live account state and
 * cross-position data this domain has no way to source itself.
 * `RiskService` is the consumer; this domain never calls a broker or
 * database directly.
 */
export interface RiskEngine {
  getAccountSnapshot(): Promise<AccountSnapshot>;
  /** The correlation coefficient (-1 to 1) between `symbolCode` and every
   * currently open position — used by the Correlation Check. */
  getCorrelationWithOpenPositions(symbolCode: SymbolCode): Promise<number>;
}
