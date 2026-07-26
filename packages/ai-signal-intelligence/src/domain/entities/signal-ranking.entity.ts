export interface SignalRankingEntry {
  readonly opportunityId: string;
  readonly symbolCode: string;
  readonly direction: string;
  readonly compositeScore: number;
}

export interface SignalRanking {
  readonly entries: readonly SignalRankingEntry[];
  readonly rankedOpportunityIds: readonly string[];
}
