import { Injectable } from "@nestjs/common";
import { MarketDataProviderType } from "@rmsm/database";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import type { NormalizedSymbolSearchResult } from "../interfaces/normalized-market-data.interface";

@Injectable()
export class InstrumentDiscoveryService {
  constructor(
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly providerRegistry: ProviderRegistryService,
  ) {}

  async searchProviderSymbols(
    providerConfigId: string,
    query: string,
    limit = 20,
  ): Promise<NormalizedSymbolSearchResult[]> {
    const config = await this.providerConfigRepository.findById(providerConfigId);

    if (!config || !config.isActive) {
      throw new NotFoundError("MarketDataProviderConfig", providerConfigId);
    }

    const provider = this.providerRegistry.get(
      config.type as MarketDataProviderType,
    );

    if (!provider.symbolSearchClient) {
      throw new ValidationError(
        `Provider "${config.type}" does not expose symbol-search capabilities.`,
      );
    }

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      throw new ValidationError("Symbol search query must not be empty.");
    }

    return provider.symbolSearchClient.search(normalizedQuery, limit);
  }
}
