/** The "tool usage" capability's unit of record. */
export interface ToolUsageMetric {
  readonly toolName: string;
  readonly invocations: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly timedOut: number;
}
