import type { TrendDirection } from "../enums/market-intelligence.enum";

export interface TrendAnalysis {
  readonly direction: TrendDirection;
  /** Normalized 0..1 — how pronounced the trend is, independent of
   * direction. */
  readonly strength: number;
  readonly slopePerBar: number;
}
