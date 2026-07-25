/** The "cost metrics" capability's unit of record. No package in this
 * codebase currently emits real cost data (no external LLM/API calls
 * exist anywhere) — `CostMetricsService.recordCost` is a direct-record
 * API a future real provider adapter would call once one exists. */
export interface CostSummary {
  readonly agentId: string;
  readonly totalAmount: number;
  readonly currency: string | null;
  readonly entryCount: number;
}
