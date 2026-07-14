import type { AssetClass, CandleInterval } from "@rmsm/database";
import type { ProviderMetadata, ProviderRateLimitInfo } from "../../interfaces/provider-metadata.interface";
import { requireField } from "./mapping.utils";
import { InvalidProviderPayloadError } from "../../validation/errors/market-data-validation.error";

export interface RawProviderMetadataPayload {
  name: string;
  version: string;
  marketsSupported: string[];
  assetClasses: AssetClass[];
  timeframes: CandleInterval[];
  supportsHistorical?: boolean;
  supportsQuotes?: boolean;
  supportsTicks?: boolean;
  supportsStreaming?: boolean;
  supportsCorporateActions?: boolean;
  rateLimits?: ProviderRateLimitInfo;
}

/** Normalizes a provider's self-reported capability metadata (Phase 2B's `ProviderMetadata` shape) into a consistent, defaulted form — booleans default to false rather than being left undefined, so downstream capability checks (`ProviderRegistry.findByCapability`) never have to treat "unspecified" as a third truthiness state. */
export function normalizeProviderMetadata(raw: RawProviderMetadataPayload): Omit<ProviderMetadata, "healthStatus"> {
  const marketsSupported = requireField(raw.marketsSupported, "marketsSupported", raw);
  const assetClasses = requireField(raw.assetClasses, "assetClasses", raw);
  if (marketsSupported.length === 0) {
    throw new InvalidProviderPayloadError("marketsSupported cannot be an empty array.", { raw });
  }
  if (assetClasses.length === 0) {
    throw new InvalidProviderPayloadError("assetClasses cannot be an empty array.", { raw });
  }

  return {
    name: requireField(raw.name, "name", raw).trim(),
    version: requireField(raw.version, "version", raw).trim(),
    marketsSupported: marketsSupported.map((m) => m.trim().toUpperCase()),
    assetClasses,
    timeframes: requireField(raw.timeframes, "timeframes", raw),
    supportsHistorical: raw.supportsHistorical ?? false,
    supportsQuotes: raw.supportsQuotes ?? false,
    supportsTicks: raw.supportsTicks ?? false,
    supportsStreaming: raw.supportsStreaming ?? false,
    supportsCorporateActions: raw.supportsCorporateActions ?? false,
    rateLimits: raw.rateLimits ?? {},
  };
}
