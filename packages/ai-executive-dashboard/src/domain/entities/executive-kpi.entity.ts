export interface ExecutiveKpi {
  readonly name: string;
  readonly value: number;
  readonly unit?: string;
}

/** Relabels REAL `@rmsm/portfolio` `PerformanceMetrics` and REAL
 * `@rmsm/ai-portfolio-intelligence` (AI-604) `PortfolioHealth` fields
 * into named KPIs — never recomputes any underlying number. */
export interface ExecutiveKpiSet {
  readonly portfolioId: string;
  readonly kpis: readonly ExecutiveKpi[];
}
