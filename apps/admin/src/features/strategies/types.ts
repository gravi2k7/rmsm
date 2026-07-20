export const TIMEFRAMES = [
  "TICK",
  "1s",
  "5s",
  "15s",
  "30s",
  "1m",
  "2m",
  "3m",
  "5m",
  "10m",
  "15m",
  "30m",
  "45m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1D",
  "1W",
  "1M",
] as const;

export const RISK_TOLERANCES = ["LOW", "MEDIUM", "HIGH"] as const;
export const STRATEGY_STATUSES = ["DRAFT", "TESTING", "PAPER_TRADING", "PRODUCTION", "ARCHIVED"] as const;

export type StrategyStatus = (typeof STRATEGY_STATUSES)[number];

export interface Strategy {
  id: string;
  name: string;
  description: string;
  status: StrategyStatus;
  enabled: boolean;
  riskTolerance: (typeof RISK_TOLERANCES)[number];
  maxRiskPerTrade: number;
  maxLeverage: number;
  maxOpenPositions: number;
  timeframe: string;
  supportedSymbols: string[];
  versionCount: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateStrategyInput {
  name: string;
  description: string;
  riskTolerance: (typeof RISK_TOLERANCES)[number];
  maxRiskPerTrade: number;
  maxLeverage: number;
  maxOpenPositions: number;
  timeframe: string;
  supportedSymbols: string[];
}

/** Matches `UpdateStrategyDto` exactly — `Strategy` (the domain
 * aggregate) has no rename/re-describe mutation, so only `status`/
 * `enabled` are editable via this endpoint. See that DTO's own doc
 * comment in apps/api for the full explanation. */
export interface UpdateStrategyInput {
  status?: StrategyStatus;
  enabled?: boolean;
}

/** Legal lifecycle transitions — mirrors `@rmsm/strategy`'s own entity
 * `ALLOWED_TRANSITIONS` exactly (including that `PRODUCTION` can only
 * go to `ARCHIVED`, not back to `PAPER_TRADING`), so the UI can disable
 * transitions that would just 409 rather than let a user attempt one
 * blind. */
export const ALLOWED_STRATEGY_TRANSITIONS: Readonly<Record<StrategyStatus, readonly StrategyStatus[]>> = {
  DRAFT: ["TESTING", "ARCHIVED"],
  TESTING: ["DRAFT", "PAPER_TRADING", "ARCHIVED"],
  PAPER_TRADING: ["TESTING", "PRODUCTION", "ARCHIVED"],
  PRODUCTION: ["ARCHIVED"],
  ARCHIVED: [],
};
