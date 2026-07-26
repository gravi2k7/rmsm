export interface StressScenarioResult {
  readonly portfolioId: string;
  readonly scenarioName: string;
  readonly shockPercentage: number;
  readonly projectedEquity: number;
  readonly projectedDrawdownPercentage: number;
  readonly breachesLimit: boolean;
}
