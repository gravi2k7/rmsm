/** Token counts for a single provider call — the raw input AI-204's
 * `CostService` turns into a `CostUsage`. */
export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}
