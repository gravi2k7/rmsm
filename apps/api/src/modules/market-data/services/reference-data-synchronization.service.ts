import { Injectable } from "@nestjs/common";
import { ExchangeRepository } from "../repositories/exchange.repository";
import { InstrumentRepository } from "../repositories/instrument.repository";
import { InstrumentAliasRepository } from "../repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../providers/provider-registry.service";
import type { MarketDataProviderType } from "@rmsm/database";
import type {
  NormalizedInstrumentReference,
} from "../interfaces/reference-data-provider.interface";

export interface ReferenceDataSynchronizationResult {
  providerType: MarketDataProviderType;
  providerConfigId: string;

  exchangesProcessed: number;
  exchangesCreatedOrUpdated: number;

  instrumentsProcessed: number;
  instrumentsCreatedOrUpdated: number;

  aliasesCreatedOrUpdated: number;

  skippedInstruments: number;
  skippedReasons: string[];
}

@Injectable()
export class ReferenceDataSynchronizationService {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly exchangeRepository: ExchangeRepository,
    private readonly instrumentRepository: InstrumentRepository,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
  ) {}

  async synchronizeTwelveData(): Promise<ReferenceDataSynchronizationResult> {
    return this.synchronizeProvider("TWELVE_DATA");
  }

  async synchronizeProvider(
    providerType: MarketDataProviderType,
  ): Promise<ReferenceDataSynchronizationResult> {
    const provider = this.providerRegistry.get(providerType);

    if (!provider.referenceDataProvider) {
      throw new Error(
        `Provider "${providerType}" does not expose reference-data capabilities.`,
      );
    }

    const providerConfig =
      await this.providerConfigRepository.findByType(providerType);

    if (!providerConfig) {
      throw new Error(
        `No provider configuration exists for "${providerType}".`,
      );
    }

    const referenceProvider = provider.referenceDataProvider;

    const exchanges = await referenceProvider.fetchExchanges();

    const exchangeMap = new Map<string, string>();

    let exchangesProcessed = 0;
    let exchangesCreatedOrUpdated = 0;

    for (const exchange of exchanges) {
      const normalizedCode = this.normalizeExchangeCode(exchange.code);

      if (!normalizedCode) {
        continue;
      }

      const persistedExchange = await this.exchangeRepository.upsert({
        code: normalizedCode,
        name: exchange.name,
        timezone: exchange.timezone,
        country: exchange.country,
      });

      exchangeMap.set(normalizedCode, persistedExchange.id);

      exchangesProcessed += 1;
      exchangesCreatedOrUpdated += 1;
    }

    // RMSM intentionally maintains a curated instrument universe.
    //
    // Provider reference-data synchronization must NOT bulk-import the
    // provider's complete instrument universe. Providers such as Twelve Data
    // can expose hundreds of thousands of instruments.
    //
    // Instruments are onboarded explicitly through provider symbol search.
    const instrumentsProcessed = 0;
    const instrumentsCreatedOrUpdated = 0;
    const aliasesCreatedOrUpdated = 0;
    const skippedInstruments = 0;
    const skippedReasons: string[] = [];

    return {
      providerType,
      providerConfigId: providerConfig.id,
      exchangesProcessed,
      exchangesCreatedOrUpdated,
      instrumentsProcessed,
      instrumentsCreatedOrUpdated,
      aliasesCreatedOrUpdated,
      skippedInstruments,
      skippedReasons,
    };
  }

  private normalizeExchangeCode(
    exchangeCode: string | undefined,
  ): string | null {
    const normalized = exchangeCode?.trim();

    return normalized ? normalized.toUpperCase() : null;
  }

  private canonicalSymbol(
    instrument: NormalizedInstrumentReference,
  ): string {
    return instrument.providerSymbol;
  }
}
