export interface AllocationEntry {
  readonly symbolCode: string;
  readonly weightPercentage: number;
}

export interface AllocationBreakdown {
  readonly portfolioId: string;
  readonly allocations: readonly AllocationEntry[];
}
