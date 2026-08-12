import { Injectable } from "@nestjs/common";
import { NotFoundError, ValidationError } from "@rmsm/shared";

import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderFactoryService } from "../providers/provider-factory.service";

@Injectable()
export class ProviderConnectionTestService {
  constructor(
    private readonly repository: MarketDataProviderConfigRepository,
    private readonly factory: ProviderFactoryService,
  ) {}

  async testConnection(id: string) {
    const config = await this.repository.findById(id);

    if (!config) {
      throw new NotFoundError("MarketDataProviderConfig", id);
    }

    const provider = this.factory.create(config);

    if (!provider.healthProvider) {
      throw new ValidationError(
        `Provider "${config.type}" does not implement HealthProvider.`,
      );
    }

    const snapshot = await provider.healthProvider.checkHealth();

    await this.repository.updateConnectionTestResult(
      id,
      snapshot.status,
      snapshot.lastCheckedAt,
    );

    return snapshot;
  }
}
