import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { BrokerType } from "../contracts/broker.contracts";
import type { BrokerProvider } from "../interfaces/broker-provider.interface";
import type { BrokerMetadata } from "../interfaces/broker-models";

/**
 * The Broker Integration domain's own registry — a deliberately
 * independent reimplementation of `ProviderRegistryService`'s exact
 * Map-based register/get/tryGet/listEnabled/getMetadata shape (Phase 2B,
 * market-data), not an import of it and not a subclass. BR-001's own
 * rule ("Do NOT modify Provider Registry") protects the market-data
 * registry from this work; the "maintain a strict separation" rule
 * means broker registration should not run through it either. A new,
 * broker-scoped registry that happens to follow the exact same proven
 * pattern satisfies both at once.
 *
 * No accompanying `BrokerFactoryService` — deliberately. Market data
 * providers are built per `MarketDataProviderConfig` DB row (an org can
 * configure several instances of the same provider type with different
 * rate limits/base URLs); BR-001 names no equivalent broker-config table,
 * and a real MT5 account connection is inherently a single, long-lived,
 * stateful session (see `MetaTrader5ConnectionManager`) rather than a
 * value built fresh per request. One eager instance per registered
 * broker type, exactly the granularity BR-001's own directory structure
 * and Configuration section (one `MT5_*` env-var set, not a per-row
 * override list) ask for.
 */
@Injectable()
export class BrokerRegistryService {
  private readonly providers = new Map<BrokerType, BrokerProvider>();

  register(provider: BrokerProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type: BrokerType): BrokerProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new ValidationError(`No broker registered for type "${type}".`);
    if (!provider.enabled) throw new ValidationError(`Broker "${type}" is registered but not enabled.`);
    return provider;
  }

  tryGet(type: BrokerType): BrokerProvider | null {
    return this.providers.get(type) ?? null;
  }

  listEnabled(): BrokerType[] {
    return [...this.providers.values()].filter((p) => p.enabled).map((p) => p.type);
  }

  getMetadata(type: BrokerType): BrokerMetadata {
    return this.get(type).metadata;
  }
}
