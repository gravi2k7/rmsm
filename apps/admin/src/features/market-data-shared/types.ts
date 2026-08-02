export const CANDLE_INTERVALS = [
  "ONE_MINUTE",
  "FIVE_MINUTES",
  "FIFTEEN_MINUTES",
  "THIRTY_MINUTES",
  "ONE_HOUR",
  "FOUR_HOURS",
  "ONE_DAY",
  "ONE_WEEK",
  "ONE_MONTH",
] as const;
export type CandleInterval = (typeof CANDLE_INTERVALS)[number];

export const ASSET_CLASSES = ["EQUITY", "ETF", "CRYPTO", "FOREX", "COMMODITY", "INDEX", "BOND", "OPTION", "FUTURE"] as const;
export const INSTRUMENT_STATUSES = ["ACTIVE", "SUSPENDED", "DELISTED", "PENDING"] as const;
export const IMPORT_JOB_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "PARTIAL", "CANCELLED"] as const;
export const DATA_GAP_STATUSES = ["DETECTED", "BACKFILLING", "RESOLVED", "UNRESOLVED", "IGNORED"] as const;
export const DATA_QUALITY_STATUSES = ["CLEAN", "FLAGGED", "UNDER_REVIEW", "CORRECTED", "IGNORED"] as const;
export const DERIVED_INDICATOR_KEYS = ["sma", "ema", "rsi", "atr", "macd", "bollinger_bands", "vwap", "pivot_points", "volatility", "trend"] as const;

export interface ProviderConfig {
  id: string;
  type: string;
  name: string;
  baseUrl?: string | null;
  rateLimitPerMinute?: number | null;
  supportedAssetClasses: string[];
  isActive: boolean;
  priority: number;
  lastConnectionTestAt?: string | null;
  lastConnectionTestStatus?: string | null;
}

export interface CredentialStatus {
  providerType: string;
  requirement: "REQUIRED" | "OPTIONAL" | "NOT_APPLICABLE" | "NOT_YET_IMPLEMENTED";
  configured: boolean;
}

export interface ProviderDiagnostics {
  providerConfigId: string;
  providerType: string;
  name: string;
  isActive: boolean;
  priority: number;
  registered: boolean;
  enabled: boolean;
  circuitState: string;
  rateLimitPerMinute?: number | null;
  credential: CredentialStatus;
  lastConnectionTestAt?: string | null;
  lastConnectionTestStatus?: string | null;
}

export interface ConnectionTestResult {
  providerConfigId: string;
  providerType: string;
  success: boolean;
  latencyMs?: number;
  message?: string;
  testedAt: string;
}

export interface Instrument {
  id: string;
  exchangeId: string;
  symbol: string;
  name: string;
  assetClass: (typeof ASSET_CLASSES)[number];
  status: (typeof INSTRUMENT_STATUSES)[number];
  currency: string;
  isin?: string | null;
  cusip?: string | null;
  tickSize?: string | null;
  lotSize?: string | null;
  pointValue?: string | null;
  listedAt?: string | null;
  delistedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Exchange {
  id: string;
  code: string;
  name: string;
  timezone: string;
  country?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ImportJob {
  id: string;
  providerId: string;
  jobType: string;
  status: (typeof IMPORT_JOB_STATUSES)[number];
  startedAt?: string | null;
  completedAt?: string | null;
  recordsProcessed: number;
  recordsFailed: number;
  errorSummary?: string | null;
}

export interface DataGap {
  id: string;
  instrumentId: string;
  interval: CandleInterval;
  gapStart: string;
  gapEnd: string;
  status: (typeof DATA_GAP_STATUSES)[number];
  detectedAt: string;
  backfilledAt?: string | null;
  repairedByProviderId?: string | null;
  repairAttempts: number;
}

export interface TableStorageStat {
  tableName: string;
  totalBytes: number;
  totalSizePretty: string;
}

export interface MonitoringDashboard {
  providerHealth: ProviderDiagnostics[];
  importJobsByStatus: Record<string, number>;
  gapsByStatus: Record<string, number>;
  qualityIssuesByStatus: Record<string, number>;
  averageQualityScores: { avgQualityScore: number | null; avgConfidenceScore: number | null };
  storageUsage: TableStorageStat[];
  totalStorageBytes: number;
}

export interface QualitySummary {
  averageScores: { avgQualityScore: number | null; avgConfidenceScore: number | null };
  issuesByStatus: Record<string, number>;
}

export interface ProviderHealthEntry {
  type: string;
  enabled: boolean;
  circuitState: "closed" | "open" | "half_open";
}

export interface SynchronizationHealth {
  status: "ok" | "degraded";
  totalFailedImportCount: number;
  providers: ProviderHealthEntry[];
  database: "ok" | "error";
}

export interface DerivedIndicatorSnapshot {
  id: string;
  instrumentId: string;
  interval: CandleInterval;
  eventTime: string;
  indicatorKey: string;
  outputs: Record<string, unknown>;
  computedAt: string;
}

export interface AiReadinessSnapshot {
  id: string;
  instrumentId: string;
  interval: CandleInterval;
  eventTime: string;
  trend?: string | null;
  volatility?: string | null;
  liquidity?: string | null;
  confidence?: string | null;
  session?: string | null;
  spread?: string | null;
  marketRegime?: string | null;
  anomalyFlags?: unknown[] | null;
  computedAt: string;
}

export interface ValidationReport {
  [key: string]: unknown;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description?: string | null;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}
