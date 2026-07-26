export const BacktestVerdict = {
  STRONG: "STRONG",
  MARGINAL: "MARGINAL",
  WEAK: "WEAK",
} as const;
export type BacktestVerdict = (typeof BacktestVerdict)[keyof typeof BacktestVerdict];
export const BACKTEST_VERDICTS = Object.values(BacktestVerdict);

export const TradePatternType = {
  WINNING_STREAK: "WINNING_STREAK",
  LOSING_STREAK: "LOSING_STREAK",
  OVERTRADING_DAY: "OVERTRADING_DAY",
  LARGE_LOSS_OUTLIER: "LARGE_LOSS_OUTLIER",
} as const;
export type TradePatternType = (typeof TradePatternType)[keyof typeof TradePatternType];
export const TRADE_PATTERN_TYPES = Object.values(TradePatternType);
