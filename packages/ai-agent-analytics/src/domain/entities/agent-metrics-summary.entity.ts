/** The "agent metrics" / "success rate" / "failure rate" / "execution
 * duration" capabilities' unit of record — a running aggregate per
 * agent, updated on every completed run rather than recomputed from a
 * raw event log (this IS a metrics store: it keeps sums and counts,
 * not history). */
export interface AgentMetricsSummary {
  readonly agentId: string;
  readonly totalRuns: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly successRate: number;
  readonly averageDurationMs: number;
}
