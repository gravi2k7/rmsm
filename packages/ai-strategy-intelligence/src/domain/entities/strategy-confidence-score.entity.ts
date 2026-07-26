export interface StrategyConfidenceScore {
  readonly strategyId: string;
  /** 0..1 */
  readonly confidence: number;
  readonly factors: Readonly<Record<string, number>>;
}
