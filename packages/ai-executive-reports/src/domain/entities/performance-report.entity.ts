import type { ReportPeriod } from "../enums/executive-reports.enum";
import type { PerformanceMetrics } from "@rmsm/portfolio";

/** Reads a REAL, unmodified `@rmsm/portfolio` `PerformanceMetrics` (from
 * its own `PerformanceService.computeMetrics()`) — never recomputes win
 * rate, profit factor, Sharpe ratio, or drawdown. */
export interface PerformanceReport {
  readonly portfolioId: string;
  readonly period: ReportPeriod;
  readonly window: { readonly start: Date; readonly end: Date };
  readonly metrics: PerformanceMetrics;
  readonly narrative: string;
  readonly generatedAt: Date;
}
