import type { Timeframe } from "@rmsm/market";
import type { TrendDirection } from "../enums/market-intelligence.enum";

export interface TimeframeTrendSummary {
  readonly timeframe: Timeframe;
  readonly direction: TrendDirection;
  readonly strength: number;
}

/** The "multi-timeframe analysis" capability's unit of record —
 * `aligned` is true when every analyzed timeframe agrees on direction
 * (excluding `SIDEWAYS`, which never blocks alignment on its own). */
export interface MultiTimeframeAnalysis {
  readonly timeframes: readonly TimeframeTrendSummary[];
  readonly aligned: boolean;
  readonly dominantDirection: TrendDirection;
}
