import { ReferenceDataSynchronizationService } from "../reference-data-synchronization.service";
import type { ProviderRegistryService } from "../../providers/provider-registry.service";
import type { MarketDataProviderConfigRepository } from "../../repositories/market-data-provider-config.repository";
import type { ExchangeRepository } from "../../repositories/exchange.repository";
import type { InstrumentRepository } from "../../repositories/instrument.repository";
import type { InstrumentAliasRepository } from "../../repositories/instrument-alias.repository";

describe("ReferenceDataSynchronizationService", () => {
  function buildService() {
    const providerRegistry = {
      get: jest.fn(),
    } as unknown as ProviderRegistryService;

    const providerConfigRepository = {
      findByType: jest.fn(),
    } as unknown as MarketDataProviderConfigRepository;

    const exchangeRepository = {
      upsert: jest.fn(),
    } as unknown as ExchangeRepository;

    const instrumentRepository = {
      upsert: jest.fn(),
    } as unknown as InstrumentRepository;

    const instrumentAliasRepository = {
      upsert: jest.fn(),
    } as unknown as InstrumentAliasRepository;

    const service = new ReferenceDataSynchronizationService(
      providerRegistry,
      providerConfigRepository,
      exchangeRepository,
      instrumentRepository,
      instrumentAliasRepository,
    );

    return {
      service,
      providerRegistry,
      providerConfigRepository,
      exchangeRepository,
      instrumentRepository,
      instrumentAliasRepository,
    };
  }

  it("synchronizes exchanges without importing the provider instrument universe", async () => {
    const {
      service,
      providerRegistry,
      providerConfigRepository,
      exchangeRepository,
      instrumentRepository,
      instrumentAliasRepository,
    } = buildService();

    const referenceDataProvider = {
      fetchExchanges: jest.fn().mockResolvedValue([
        {
          code: "xnas",
          name: "NASDAQ",
          timezone: "America/New_York",
          country: "United States",
        },
      ]),
      fetchInstrumentUniverse: jest.fn(),
    };

    (providerRegistry.get as jest.Mock).mockReturnValue({
      type: "TWELVE_DATA",
      enabled: true,
      referenceDataProvider,
    });

    (providerConfigRepository.findByType as jest.Mock).mockResolvedValue({
      id: "provider-config-1",
      type: "TWELVE_DATA",
    });

    (exchangeRepository.upsert as jest.Mock).mockResolvedValue({
      id: "exchange-1",
      code: "XNAS",
    });

    const result = await service.synchronizeTwelveData();

    expect(providerRegistry.get).toHaveBeenCalledWith("TWELVE_DATA");

    expect(providerConfigRepository.findByType).toHaveBeenCalledWith(
      "TWELVE_DATA",
    );

    expect(referenceDataProvider.fetchExchanges).toHaveBeenCalledTimes(1);

    expect(
      referenceDataProvider.fetchInstrumentUniverse,
    ).not.toHaveBeenCalled();

    expect(exchangeRepository.upsert).toHaveBeenCalledWith({
      code: "XNAS",
      name: "NASDAQ",
      timezone: "America/New_York",
      country: "United States",
    });

    expect(instrumentRepository.upsert).not.toHaveBeenCalled();
    expect(instrumentAliasRepository.upsert).not.toHaveBeenCalled();

    expect(result).toEqual({
      providerType: "TWELVE_DATA",
      providerConfigId: "provider-config-1",
      exchangesProcessed: 1,
      exchangesCreatedOrUpdated: 1,
      instrumentsProcessed: 0,
      instrumentsCreatedOrUpdated: 0,
      aliasesCreatedOrUpdated: 0,
      skippedInstruments: 0,
      skippedReasons: [],
    });
  });

  it("fails when the provider does not expose reference-data capability", async () => {
    const {
      service,
      providerRegistry,
    } = buildService();

    (providerRegistry.get as jest.Mock).mockReturnValue({
      type: "TWELVE_DATA",
      enabled: true,
    });

    await expect(
      service.synchronizeTwelveData(),
    ).rejects.toThrow(
      'Provider "TWELVE_DATA" does not expose reference-data capabilities.',
    );
  });

  it("fails when no provider configuration exists", async () => {
    const {
      service,
      providerRegistry,
      providerConfigRepository,
    } = buildService();

    (providerRegistry.get as jest.Mock).mockReturnValue({
      type: "TWELVE_DATA",
      enabled: true,
      referenceDataProvider: {
        fetchExchanges: jest.fn(),
        fetchInstrumentUniverse: jest.fn(),
      },
    });

    (providerConfigRepository.findByType as jest.Mock).mockResolvedValue(null);

    await expect(
      service.synchronizeTwelveData(),
    ).rejects.toThrow(
      'No provider configuration exists for "TWELVE_DATA".',
    );
  });
});
