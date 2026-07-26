import type { ReportPeriod } from "../enums/executive-reports.enum";

/** Composes a `PortfolioReport`, `RiskReport`, and `PerformanceReport`
 * (each produced elsewhere in this package, all reading REAL AI-604/
 * AI-605/@rmsm/portfolio data) into one headline-plus-bullets executive
 * view — never recomputes any of their underlying analyses. */
export interface ExecutiveSummary {
  readonly portfolioId: string;
  readonly period: ReportPeriod;
  readonly headline: string;
  readonly keyPoints: readonly string[];
  readonly generatedAt: Date;
}
