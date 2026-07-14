import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { MarketDataProviderType } from "@rmsm/database";
import type {
  MarketDataProvider,
  ProviderRegistry as ProviderRegistryContract,
} from "../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../interfaces/provider-metadata.interface";

/**
 * Real implementation of Phase 1's `ProviderRegistry` contract, built to
 * Phase 2B's explicit spec: registration, lookup, discovery,
 * capabilities, health metadata. Backed by a `Map`, not a switch
 * statement or hardcoded provider list — registering a new provider type
 * never requires editing this class (Phase 2B's "future providers must
 * only require implementing the interface and registering — no other
 * code changes").
 *
 * Registration itself happens externally (a future provider adapter
 * module calls `register()` from its own `OnModuleInit`, per the
 * Dependency Injection requirement — "no service should instantiate
 * providers directly, everything resolves through Registry/Factory").
 * This phase registers exactly one real provider
 * (`InternalFeedProvider`, `providers/internal-feed.provider.ts`) to
 * prove the registration → lookup → discovery path genuinely works end
 * to end — see that file's own comment for why a deterministic,
 * non-network provider is real code, not a placeholder, matching
 * EP-004's `MockProvider` precedent.
 */
@Injectable()
export class ProviderRegistryService implements ProviderRegistryContract {
  private readonly providers = new Map<MarketDataProviderType, MarketDataProvider>();

  register(provider: MarketDataProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: MarketDataProviderType): MarketDataProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new ValidationError(`No provider registered for type "${type}".`);
    if (!provider.enabled) throw new ValidationError(`Provider "${type}" is registered but not enabled.`);
    return provider;
  }

  tryGet(type: MarketDataProviderType): MarketDataProvider | null {
    return this.providers.get(type) ?? null;
  }

  listEnabled(): MarketDataProviderType[] {
    return [...this.providers.values()].filter((p) => p.enabled).map((p) => p.type);
  }

  findByCapability(predicate: (metadata: ProviderMetadata) => boolean): MarketDataProvider[] {
    return [...this.providers.values()].filter((p) => p.enabled && predicate(p.metadata));
  }

  getMetadata(type: MarketDataProviderType): ProviderMetadata {
    return this.get(type).metadata;
  }
}
