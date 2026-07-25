/** The "memory usage" capability's unit of record — a write-count
 * proxy for how heavily an agent is exercising AI-203's memory
 * platform (no byte-size tracking is available anywhere in this
 * codebase, so write frequency is the honest signal this package can
 * offer). */
export interface MemoryUsageMetric {
  readonly agentId: string;
  readonly writeCount: number;
}
