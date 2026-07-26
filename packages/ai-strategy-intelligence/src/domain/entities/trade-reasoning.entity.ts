export interface TradeReasoning {
  readonly strategyId: string;
  readonly symbolCode: string;
  readonly narrative: string;
  readonly entryRulesConsidered: number;
  readonly exitRulesConsidered: number;
  /** Set only when a real `StrategyEngine` port was supplied and could
   * be asked whether the entry signal is active right now; `null` means
   * this reasoning is rule-description-only, no live evaluation. */
  readonly liveEntrySignalActive: boolean | null;
}
