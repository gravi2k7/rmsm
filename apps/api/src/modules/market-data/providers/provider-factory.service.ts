import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { MarketDataProviderType } from "@rmsm/database";
import type {
  MarketDataProvider,
  MarketDataProviderFactory as MarketDataProviderFactoryContract,
} from "../interfaces/market-data-provider.interface";
import type { MarketDataProviderConfigModel } from "../interfaces/models/reference-data.models";

/**
 * Real implementation of Phase 1's `MarketDataProviderFactory` contract.
 * Provider selection is a `Map<MarketDataProviderType, builder>` lookup —
 * genuinely zero `switch`/`if`-chain-on-provider-type anywhere in this
 * class or anywhere else in the application, per Phase 2B's explicit
 * "no switch statements throughout the application" requirement. A
 * future provider adapter module registers its own builder function via
 * `registerBuilder()` at NestJS module-init time; this class never has
 * provider-specific code and never needs editing when a new provider
 * type is added.
 */
@Injectable()
export class ProviderFactoryService implements MarketDataProviderFactoryContract {
  private readonly builders = new Map<MarketDataProviderType, (config: MarketDataProviderConfigModel) => MarketDataProvider>();

  registerBuilder(type: MarketDataProviderType, build: (config: MarketDataProviderConfigModel) => MarketDataProvider): void {
    this.builders.set(type, build);
  }

  create(config: MarketDataProviderConfigModel): MarketDataProvider {
    const builder = this.builders.get(config.type);
    if (!builder) {
      throw new ValidationError(`No provider builder registered for type "${config.type}" — implement MarketDataProvider and call registerBuilder() before this type can be constructed.`);
    }
    return builder(config);
  }
}
