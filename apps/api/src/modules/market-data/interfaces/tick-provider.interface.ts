import type { NormalizedTick } from "./normalized-market-data.interface";

/** One of the 8 capability interfaces named in Phase 2B. Distinct from a future streaming tick feed (explicitly deferred, ADR-023) — this is a pull-based "give me recent ticks" contract, the same request/response shape as HistoricalDataClient, not a subscription. */
export interface TickProvider {
  fetchRecentTicks(providerSymbol: string, limit: number): Promise<NormalizedTick[]>;
}
