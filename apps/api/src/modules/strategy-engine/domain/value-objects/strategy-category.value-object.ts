/**
 * A controlled category vocabulary — "Strategy Categories" (item), the
 * same closed-set-taxonomy pattern AI-102's own `IndicatorCategory`
 * established for its own domain. Trading-strategy-specific, not
 * reused from AI-102 (a strategy's own category concept — "Trend
 * Following," "Mean Reversion" — is a genuinely different taxonomy
 * than an indicator's category, even though the pattern of "a closed
 * set of named buckets" is shared).
 */
export type StrategyCategory =
  | "TREND_FOLLOWING"
  | "MEAN_REVERSION"
  | "MOMENTUM"
  | "BREAKOUT"
  | "SCALPING"
  | "SWING"
  | "ARBITRAGE"
  | "MARKET_MAKING"
  | "CUSTOM";

/**
 * Tags are deliberately NOT a closed set (unlike category) — item
 * "Strategy Tags" is freeform, author-defined labels ("volatile-pairs,"
 * "backtested-2024," "needs-review"), a real, common distinction
 * between a controlled taxonomy (category — used for structured
 * filtering/navigation) and an open folksonomy (tags — used for
 * flexible, author-driven organization). Modeled as a plain string
 * with a validated shape, not a lookup entity with its own identity —
 * a tag has no attributes beyond its own text.
 */
export type StrategyTag = string;

export const STRATEGY_TAG_PATTERN = /^[a-z0-9][a-z0-9-]{0,49}$/;
