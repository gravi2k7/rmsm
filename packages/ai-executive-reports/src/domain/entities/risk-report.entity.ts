import type { ReportPeriod } from "../enums/executive-reports.enum";
import type { RiskAnalysis, DrawdownAnalysis, RiskAlert } from "@rmsm/ai-risk-intelligence";

/** Reads REAL `@rmsm/ai-risk-intelligence` (AI-605) `RiskAnalysis`,
 * `DrawdownAnalysis`, and `RiskAlert`s — never recomputes any of them. */
export interface RiskReport {
  readonly subjectId: string;
  readonly period: ReportPeriod;
  readonly window: { readonly start: Date; readonly end: Date };
  readonly riskAnalysis: RiskAnalysis;
  readonly drawdown: DrawdownAnalysis;
  readonly alerts: readonly RiskAlert[];
  readonly narrative: string;
  readonly generatedAt: Date;
}
