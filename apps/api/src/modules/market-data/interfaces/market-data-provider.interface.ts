import type { MarketDataProviderType } from "@rmsm/database";
import type { HistoricalDataClient } from "./historical-data-client.interface";
import type { QuoteClient } from "./quote-client.interface";
import type { SymbolSearchClient } from "./symbol-search-client.interface";
import type { TickProvider } from "./tick-provider.interface";
import type { CorporateActionProvider } from "./corporate-action-provider.interface";
import type { ReferenceDataProvider } from "./reference-data-provider.interface";
import type { HealthProvider } from "./health-provider.interface";
import type { InstrumentProvider } from "./instrument-provider.interface";
import type { ProviderRateLimitPolicy } from "./provider-rate-limit-policy.interface";
import type { ProviderErrorMapper } from "./provider-error-mapper.interface";
import type { ProviderMetadata } from "./provider-metadata.interface";
import type { MarketDataProviderConfigModel } from "./models/reference-data.models";

/**
 * The composite contract a provider adapter implements — one class per
 * MarketDataProviderType. Phase 2B named 8 capability interfaces
 * (Historical/Quote/Tick/CorporateAction/ReferenceData/Health/Instrument/
 * Search Provider); the first two and the last were already
 * `HistoricalDataClient`/`QuoteClient`/`SymbolSearchClient` from Phase 1
 * — kept under those names rather than renamed, since renaming a working
 * Phase 1 contract for naming-consistency alone isn't worth the churn.
 * This composite interface documents that mapping explicitly rather than
 * leaving a reader to guess why 3 of 8 fields don't match the prompt's
 * naming verbatim. Every field is optional except `metadata` —
 * `metadata.supportsX` is how a caller checks capability support in
 * general (Phase 2B's "capabilities" requirement on ProviderRegistry);
 * the optional field being present/absent is how a caller gets the
 * actual client to call once it knows support exists.
 */
export interface MarketDataProvider {
  readonly type: MarketDataProviderType;
  readonly enabled: boolean;
  readonly metadata: ProviderMetadata;

  /** = "Historical Provider" (Phase 2B naming) */
  readonly historicalDataClient?: HistoricalDataClient;
  /** = "Quote Provider" */
  readonly quoteClient?: QuoteClient;
  /** = "Search Provider" */
  readonly symbolSearchClient?: SymbolSearchClient;
  readonly tickProvider?: TickProvider;
  readonly corporateActionProvider?: CorporateActionProvider;
  readonly referenceDataProvider?: ReferenceDataProvider;
  readonly healthProvider?: HealthProvider;
  readonly instrumentProvider?: InstrumentProvider;

  readonly rateLimitPolicy: ProviderRateLimitPolicy;
  readonly errorMapper: ProviderErrorMapper;
}

/**
 * Constructs a MarketDataProvider instance. No switch statement anywhere
 * in an implementation of this interface — Phase 2B's explicit
 * "provider selection must happen here [the factory], no switch
 * statements throughout the application" requirement is satisfied by a
 * registration-based dispatch (a Map from MarketDataProviderType to a
 * builder function), not a branching statement. See
 * `providers/provider-factory.service.ts`'s implementation and class
 * comment for how.
 */
export interface MarketDataProviderFactory {
  registerBuilder(type: MarketDataProviderType, build: (config: MarketDataProviderConfigModel) => MarketDataProvider): void;
  create(config: MarketDataProviderConfigModel): MarketDataProvider;
}

/**
 * Registration, lookup, discovery, capability query, and health metadata
 * — Phase 2B's explicit list of what this owns. `MarketDataProviderFactory`
 * is the construction side; this is the read/registration side, same
 * registry+factory split as EP-005's ProviderFactory/EmailProviderRegistry
 * pair (the fourth application of this shape in this project).
 */
export interface ProviderRegistry {
  register(provider: MarketDataProvider): void;
  get(type: MarketDataProviderType): MarketDataProvider;
  tryGet(type: MarketDataProviderType): MarketDataProvider | null;
  listEnabled(): MarketDataProviderType[];
  /** Discovery by capability — "every enabled provider that supports corporate actions for CRYPTO," the concrete shape Phase 2B's ProviderResolver builds its own logic on top of. */
  findByCapability(predicate: (metadata: ProviderMetadata) => boolean): MarketDataProvider[];
  getMetadata(type: MarketDataProviderType): ProviderMetadata;
}
