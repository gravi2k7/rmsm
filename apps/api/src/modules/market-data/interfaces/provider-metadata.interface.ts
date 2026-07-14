import type { AssetClass, CandleInterval } from "@rmsm/database";
import type { ProviderOutageClassification } from "../contracts/workflow.contracts";

export interface ProviderRateLimitInfo {
  requestsPerMinute?: number;
  requestsPerDay?: number;
}

/**
 * The metadata every provider exposes, per Phase 2B's explicit example
 * list. `ProviderRegistry`'s discovery/capability-query methods work
 * entirely off this shape — "does provider X support corporate actions
 * for asset class Y" is a metadata read, never a runtime probe against
 * the provider itself.
 */
export interface ProviderMetadata {
  name: string;
  version: string;
  marketsSupported: string[];
  assetClasses: AssetClass[];
  timeframes: CandleInterval[];
  supportsHistorical: boolean;
  supportsQuotes: boolean;
  supportsTicks: boolean;
  supportsStreaming: boolean;
  supportsCorporateActions: boolean;
  rateLimits: ProviderRateLimitInfo;
  /** A snapshot at metadata-read time, not a live probe — HealthProvider.checkHealth() is the live check; this field is what the registry last observed, useful for discovery/listing without an actual network round trip per list() call. */
  healthStatus: ProviderOutageClassification;
}
