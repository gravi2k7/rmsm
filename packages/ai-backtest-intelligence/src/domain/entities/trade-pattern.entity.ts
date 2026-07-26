import type { TradePatternType } from "../enums/backtest-intelligence.enum";

export interface TradePattern {
  readonly type: TradePatternType;
  readonly description: string;
  readonly occurrences: number;
}

export interface PatternDetectionResult {
  readonly runId: string;
  readonly patterns: readonly TradePattern[];
}
