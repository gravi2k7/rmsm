import type { ReportPeriod } from "../enums/executive-reports.enum";
import type { PortfolioHealth, DiversificationAnalysis } from "@rmsm/ai-portfolio-intelligence";

/** Reads a REAL `@rmsm/ai-portfolio-intelligence` (AI-604)
 * `PortfolioHealth` and `DiversificationAnalysis` — never recomputes
 * either. */
export interface PortfolioReport {
  readonly portfolioId: string;
  readonly period: ReportPeriod;
  readonly window: { readonly start: Date; readonly end: Date };
  readonly health: PortfolioHealth;
  readonly diversification: DiversificationAnalysis;
  readonly narrative: string;
  readonly generatedAt: Date;
}
