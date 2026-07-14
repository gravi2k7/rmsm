import { Injectable, OnModuleInit } from "@nestjs/common";
import { ProviderRegistryService } from "./provider-registry.service";
import { ProviderFactoryService } from "./provider-factory.service";
import { InternalFeedProvider } from "./internal-feed.provider";

/**
 * Registers every provider this phase actually has (just `InternalFeedProvider`
 * this phase — Binance/Polygon/etc. adapters are Phase 2B's explicitly
 * deferred "provider SDK implementations") with both the Registry and
 * the Factory at application startup. This is the ONE place a concrete
 * provider type is named in application wiring — everywhere else
 * (Registry, Factory, Resolver, any future service) works only through
 * the `MarketDataProvider` interface and the Map-based lookups those
 * classes already have. A future Binance/Polygon adapter module adds
 * its own registration call here (or, more likely once there are many,
 * in its own small registrar) — "implement the interface, register with
 * the registry, no other code changes," per Phase 2B's explicit
 * engineering rule.
 */
@Injectable()
export class ProviderRegistrarService implements OnModuleInit {
  constructor(
    private readonly registry: ProviderRegistryService,
    private readonly factory: ProviderFactoryService,
  ) {}

  onModuleInit(): void {
    const internalFeed = new InternalFeedProvider();
    this.registry.register(internalFeed);
    this.factory.registerBuilder("INTERNAL_FEED", () => new InternalFeedProvider());
  }
}
