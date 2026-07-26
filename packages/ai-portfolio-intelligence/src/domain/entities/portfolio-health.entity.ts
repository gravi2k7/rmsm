import type { PortfolioHealthVerdict } from "../enums/portfolio-intelligence.enum";

/** Reads a REAL, unmodified `@rmsm/portfolio` `PerformanceMetrics` and
 * `Exposure` — never recomputes win rate, profit factor, drawdown, or
 * exposure itself, only classifies them into one verdict. */
export interface PortfolioHealth {
  readonly portfolioId: string;
  readonly verdict: PortfolioHealthVerdict;
  readonly reasons: readonly string[];
}
