import { Injectable } from "@nestjs/common";
import { NotFoundError, ValidationError } from "@rmsm/shared";

import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../providers/provider-registry.service";

@Injectable()
export class ProviderConnectionTestService {
  constructor(
    private readonly repository: MarketDataProviderConfigRepository,
    private readonly registry: ProviderRegistryService,
  ) {}

  async testConnection(id: string) {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new NotFoundError("MarketDataProviderConfig", id);
    }

    const provider = this.registry.tryGet(config.type);

    if (!provider) {
      throw new ValidationError(
        `Provider "${config.type}" is not registered.`,
      );
    }

    if (!provider.healthProvider) {
      throw new ValidationError(
        `Provider "${config.type}" does not implement HealthProvider.`,
      );
    }

    return provider.healthProvider.checkHealth();
  }
}