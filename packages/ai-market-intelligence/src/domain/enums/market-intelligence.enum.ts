export enum TrendDirection {
  UP = "UP",
  DOWN = "DOWN",
  SIDEWAYS = "SIDEWAYS",
}

export enum VolatilityLevel {
  LOW = "LOW",
  MODERATE = "MODERATE",
  HIGH = "HIGH",
  EXTREME = "EXTREME",
}

export enum LiquidityLevel {
  LOW = "LOW",
  MODERATE = "MODERATE",
  HIGH = "HIGH",
}

export enum MarketStructure {
  UPTREND = "UPTREND",
  DOWNTREND = "DOWNTREND",
  CONSOLIDATION = "CONSOLIDATION",
}

export enum TradingSession {
  ASIAN = "ASIAN",
  LONDON = "LONDON",
  NEW_YORK = "NEW_YORK",
  LONDON_NEW_YORK_OVERLAP = "LONDON_NEW_YORK_OVERLAP",
  CLOSED = "CLOSED",
}

/** The "market regime detection" capability's vocabulary — a single
 * synthesis of trend + volatility, deliberately coarser than either
 * alone (a `RANGING` regime can still have a mild `TrendDirection`; what
 * makes it `RANGING` is low trend strength relative to volatility). */
export enum MarketRegime {
  TRENDING_UP = "TRENDING_UP",
  TRENDING_DOWN = "TRENDING_DOWN",
  RANGING = "RANGING",
  VOLATILE = "VOLATILE",
  QUIET = "QUIET",
}

export enum MarketAlertSeverity {
  INFO = "INFO",
  WARNING = "WARNING",
  CRITICAL = "CRITICAL",
}

export const TREND_DIRECTIONS = Object.values(TrendDirection) as readonly TrendDirection[];
export const VOLATILITY_LEVELS = Object.values(VolatilityLevel) as readonly VolatilityLevel[];
export const LIQUIDITY_LEVELS = Object.values(LiquidityLevel) as readonly LiquidityLevel[];
export const MARKET_STRUCTURES = Object.values(MarketStructure) as readonly MarketStructure[];
export const TRADING_SESSIONS = Object.values(TradingSession) as readonly TradingSession[];
export const MARKET_REGIMES = Object.values(MarketRegime) as readonly MarketRegime[];
export const MARKET_ALERT_SEVERITIES = Object.values(MarketAlertSeverity) as readonly MarketAlertSeverity[];
