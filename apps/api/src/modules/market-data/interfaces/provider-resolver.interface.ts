import type { AssetClass, MarketDataProviderType } from "@rmsm/database";
import type { MarketDataProvider } from "./market-data-provider.interface";

/**
 * Resolution context — Phase 2B's explicit "resolve provider by:
 * organization configuration, market, asset class, environment."
 *
 * `organizationPreferredProviderType` is deliberately a plain parameter,
 * NOT a stored column anywhere in AI-101's own schema. ADR-021 (Phase 1)
 * is explicit that AI-101 has no `organizationId` anywhere — market data
 * is global/product data. An organization's own preferred-provider
 * setting is a real, legitimate concept, but the data for it belongs to
 * a FUTURE organization-scoped module (the same "organization-specific
 * research artifacts belong in future modules" boundary Phase 1's
 * architecture doc already drew) — that future module resolves its own
 * stored preference and passes the result in here as a value, exactly
 * like it would pass in any other resolution hint. This resolver never
 * queries organization data itself, and AI-101 gains no new tenant
 * coupling to satisfy this requirement. Recorded as ADR-026.
 */
export interface ProviderResolutionContext {
  organizationPreferredProviderType?: MarketDataProviderType;
  assetClass?: AssetClass;
  exchangeCode?: string;
  environment?: "production" | "sandbox" | "development";
}

/**
 * Resolution precedence (most to least specific) — documented here since
 * "resolve by X, Y, Z" alone doesn't say which wins when more than one
 * applies: an explicit organization preference (if that provider is
 * enabled and supports the requested asset class) wins outright;
 * otherwise the first enabled provider supporting the requested asset
 * class wins; otherwise the platform default. `environment` narrows
 * WHICH registered instance of a given provider type gets used (a
 * provider might be registered once per environment with different
 * base URLs), not a separate ranking dimension.
 */
export interface ProviderResolver {
  resolve(context: ProviderResolutionContext): MarketDataProvider;
}
