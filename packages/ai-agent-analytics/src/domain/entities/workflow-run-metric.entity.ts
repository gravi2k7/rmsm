/** The "workflow metrics" capability's unit of record. */
export interface WorkflowRunMetric {
  readonly totalRuns: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly cancelled: number;
  readonly successRate: number;
}
