import type { ProviderMetadata } from "../interfaces/provider-metadata.interface";
import type { AssetClass, CandleInterval } from "@rmsm/database";
import { InvalidProviderPayloadError } from "./errors/market-data-validation.error";

/** Capability, metadata, and configuration validation for providers — the third named validation category (Phase 2C item 2's "Provider Data" section). */

export function assertMetadataInternallyConsistent(metadata: ProviderMetadata): void {
  if (metadata.assetClasses.length === 0) {
    throw new InvalidProviderPayloadError("Provider metadata must declare at least one supported asset class.", { metadata });
  }
  if (metadata.marketsSupported.length === 0) {
    throw new InvalidProviderPayloadError("Provider metadata must declare at least one supported market.", { metadata });
  }
  // A provider claiming supportsHistorical but declaring zero timeframes
  // is internally inconsistent — historical data is always requested at
  // SOME timeframe.
  if (metadata.supportsHistorical && metadata.timeframes.length === 0) {
    throw new InvalidProviderPayloadError('Provider metadata declares supportsHistorical=true but timeframes is empty.', { metadata });
  }
}

/** Checks a specific requested capability against a provider's declared metadata — the concrete check `ProviderResolver` (Phase 2B) implicitly relies on, made explicit and reusable here. */
export function assertCapabilitySupported(
  metadata: ProviderMetadata,
  requirement: { assetClass?: AssetClass; interval?: CandleInterval; needsHistorical?: boolean; needsQuotes?: boolean; needsTicks?: boolean; needsCorporateActions?: boolean },
): void {
  if (requirement.assetClass && !metadata.assetClasses.includes(requirement.assetClass)) {
    throw new InvalidProviderPayloadError(`Provider "${metadata.name}" does not support asset class ${requirement.assetClass}.`, { metadata, requirement });
  }
  if (requirement.interval && !metadata.timeframes.includes(requirement.interval)) {
    throw new InvalidProviderPayloadError(`Provider "${metadata.name}" does not support interval ${requirement.interval}.`, { metadata, requirement });
  }
  if (requirement.needsHistorical && !metadata.supportsHistorical) {
    throw new InvalidProviderPayloadError(`Provider "${metadata.name}" does not support historical data.`, { metadata, requirement });
  }
  if (requirement.needsQuotes && !metadata.supportsQuotes) {
    throw new InvalidProviderPayloadError(`Provider "${metadata.name}" does not support quotes.`, { metadata, requirement });
  }
  if (requirement.needsTicks && !metadata.supportsTicks) {
    throw new InvalidProviderPayloadError(`Provider "${metadata.name}" does not support ticks.`, { metadata, requirement });
  }
  if (requirement.needsCorporateActions && !metadata.supportsCorporateActions) {
    throw new InvalidProviderPayloadError(`Provider "${metadata.name}" does not support corporate actions.`, { metadata, requirement });
  }
}

export interface ProviderConfigurationInput {
  baseUrl?: string;
  rateLimitPerMinute?: number;
}

/** Configuration validation (Phase 2C's explicit "configuration validation") — format/sanity only, never touches credentials (this module never sees them, per Phase 1's "no real API keys or secrets" rule, unchanged). */
export function assertValidProviderConfiguration(config: ProviderConfigurationInput): void {
  if (config.baseUrl !== undefined) {
    try {
      new URL(config.baseUrl);
    } catch {
      throw new InvalidProviderPayloadError(`"${config.baseUrl}" is not a valid URL.`, { config });
    }
  }
  if (config.rateLimitPerMinute !== undefined && config.rateLimitPerMinute <= 0) {
    throw new InvalidProviderPayloadError(`rateLimitPerMinute must be positive; got ${config.rateLimitPerMinute}.`, { config });
  }
}
