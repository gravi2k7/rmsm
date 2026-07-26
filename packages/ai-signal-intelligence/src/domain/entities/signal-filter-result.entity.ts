export interface ExcludedSignal {
  readonly opportunityId: string;
  readonly reason: string;
}

export interface SignalFilterResult {
  readonly includedOpportunityIds: readonly string[];
  readonly excluded: readonly ExcludedSignal[];
}
