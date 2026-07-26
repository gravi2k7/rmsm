export interface MonitoredExposure {
  readonly scope: string;
  readonly scopeId?: string;
  readonly percentage: number;
  readonly limitPercentage: number;
  readonly withinLimit: boolean;
}

/** Batches REAL `@rmsm/portfolio` `Exposure` checks (from
 * `RiskMonitorService`) — aggregation only, no new exposure math. */
export interface ExposureMonitoringResult {
  readonly portfolioId: string;
  readonly exposures: readonly MonitoredExposure[];
  readonly anyBreached: boolean;
}
