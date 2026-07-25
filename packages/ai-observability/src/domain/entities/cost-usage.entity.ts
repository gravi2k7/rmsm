/** A `TokenUsage`, priced. Kept as a distinct entity from `TokenUsage`
 * itself (per the spec's own "TokenUsage / CostUsage" split) because
 * token counts are a hard fact of a provider response, while cost is a
 * derived value that depends on a pricing table `CostService` owns and
 * that can change independently of anything the provider reports. */
export interface CostUsage {
  readonly promptCostUsd: number;
  readonly completionCostUsd: number;
  readonly totalCostUsd: number;
  readonly currency: "USD";
}
