import type { RebalanceAction } from "../enums/portfolio-intelligence.enum";

export interface RebalancingSuggestion {
  readonly portfolioId: string;
  readonly symbolCode: string;
  readonly action: RebalanceAction;
  readonly currentWeightPercentage: number;
  readonly targetWeightPercentage: number;
}
