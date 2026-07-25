export interface LatencyMetric {
  readonly requestId: string;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly durationMs: number;
}
