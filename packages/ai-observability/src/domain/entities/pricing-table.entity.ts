/** Per-1000-token USD pricing for one provider/model pair — the table
 * `CostService` looks up to turn a `TokenUsage` into a `CostUsage`. */
export interface ModelPricing {
  readonly providerName: string;
  readonly model: string;
  readonly promptCostPer1kUsd: number;
  readonly completionCostPer1kUsd: number;
}
