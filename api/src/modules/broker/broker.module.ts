import { Module } from "@nestjs/common";
import { BrokerRegistryService } from "./providers/broker-registry.service";
import { MetaTrader5CacheService } from "./providers/metatrader5/metatrader5.cache";
import { MetaTrader5RegistrarService } from "./providers/metatrader5/metatrader5.module";

/**
 * BR-001 — the Broker Integration domain's own NestJS module, structurally
 * parallel to (but NOT importing from or depending on) `MarketDataModule`
 * — see this domain's own `contracts/broker.contracts.ts` and
 * `providers/broker-registry.service.ts` doc comments for why no shared
 * registry/error/health vocabulary is reused from Market Data.
 *
 * `BrokerRegistryService` is exported so a future Trading Engine module
 * can resolve `BrokerType` → `BrokerProvider` (e.g. `registry.get("METATRADER5")`)
 * without this module needing to know about that consumer, mirroring how
 * `MarketDataModule` exports its own `ProviderRegistryService`.
 *
 * Adding a second broker (Angel One SmartAPI, Interactive Brokers,
 * cTrader, FIX API) means adding that broker's own
 * `providers/<broker>/` directory plus one more `providers: [...]` entry
 * here (its own cache service + its own `*RegistrarService`) — no change
 * to this file's structure, `BrokerRegistryService`, or any interface in
 * `interfaces/`, per BR-001's own "Future Broker Compatibility" requirement.
 */
@Module({
  providers: [BrokerRegistryService, MetaTrader5CacheService, MetaTrader5RegistrarService],
  exports: [BrokerRegistryService],
})
export class BrokerModule {}
