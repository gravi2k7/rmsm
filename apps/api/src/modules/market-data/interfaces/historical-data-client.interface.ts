import type { CandleInterval } from "@rmsm/database";
import type { NormalizedCandle } from "./normalized-market-data.interface";

export interface HistoricalDataRequest {
  providerSymbol: string;
  interval: CandleInterval;
  /** Both inclusive, both UTC — per this module's data standard, every timestamp crossing a contract boundary is UTC, never a provider's local convention. */
  from: Date;
  to: Date;
  /** Providers paginate differently; this is an opaque, provider-defined cursor a Phase 2 adapter interprets, not something this contract gives meaning to. */
  pageCursor?: string;
}

export interface HistoricalDataResponse {
  candles: NormalizedCandle[];
  nextPageCursor?: string;
}

/** One of the three client contracts named in the prompt's Provider Architecture section — implemented per-provider in Phase 2, never called directly by anything outside this module's own services. */
export interface HistoricalDataClient {
  fetchCandles(request: HistoricalDataRequest): Promise<HistoricalDataResponse>;
}
