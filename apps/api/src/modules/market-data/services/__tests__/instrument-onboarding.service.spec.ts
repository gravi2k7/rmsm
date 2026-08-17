import { NotFoundError, ValidationError } from "@rmsm/shared";
import { InstrumentOnboardingService } from "../instrument-onboarding.service";
import type { MarketDataProviderConfigRepository } from "../../repositories/market-data-provider-config.repository";
import type { InstrumentRepository } from "../../repositories/instrument.repository";
import type { InstrumentAliasRepository } from "../../repositories/instrument-alias.repository";
import type { ExchangeRepository } from "../../repositories/exchange.repository";
import type { TransactionManager } from "@rmsm/database";

describe("InstrumentOnboardingService", () => {
  const providerConfig = {
    id: "provider-1",
    type: "TWELVE_DATA",
    name: "Twelve Data",
    baseUrl: "https://api.twelvedata.com",
    credentialReference: null,
    rateLimitPerMinute: 8,
    supportedAssetClasses: ["EQUITY", "ETF", "CRYPTO", "FOREX", "COMMODITY", "INDEX", "BOND", "OPTION", "FUTURE"],
    isActive: true,
    priority: 10,
    lastConnectionTestAt: null,
    lastConnectionTestStatus: null,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const instrument = {
    id: "instrument-1",
    exchangeId: "exchange-1",
    symbol: "AAPL",
    name: "Apple Inc",
    assetClass: "EQUITY",
    status: "ACTIVE",
    currency: "USD",
    isin: null,
    cusip: null,
    tickSize: null,
    lotSize: null,
    listedAt: null,
    delistedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as const;

  function buildService(overrides: {
    providerConfigRepository?: Partial<MarketDataProviderConfigRepository>;
    instrumentRepository?: Partial<InstrumentRepository>;
    instrumentAliasRepository?: Partial<InstrumentAliasRepository>;
    exchangeRepository?: Partial<ExchangeRepository>;
    transactionManager?: Partial<TransactionManager>;
  } = {}) {
    const providerConfigRepository = {
      findById: jest.fn().mockResolvedValue(providerConfig),
      ...overrides.providerConfigRepository,
    } as unknown as MarketDataProviderConfigRepository;

    const instrumentRepository = {
      upsert: jest.fn().mockResolvedValue(instrument),
      ...overrides.instrumentRepository,
    } as unknown as InstrumentRepository;

    const instrumentAliasRepository = {
      upsert: jest.fn().mockResolvedValue({
        id: "alias-1",
        instrumentId: instrument.id,
        providerId: providerConfig.id,
        providerSymbol: "AAPL",
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      ...overrides.instrumentAliasRepository,
    } as unknown as InstrumentAliasRepository;

    const exchangeRepository = {
      findByCode: jest.fn().mockResolvedValue({
        id: "exchange-1",
        code: "XNAS",
        name: "NASDAQ",
        timezone: "America/New_York",
        country: "US",
        isActive: true,
      }),
      ...overrides.exchangeRepository,
    } as unknown as ExchangeRepository;

    const transactionManager = {
      run: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({}),
      ),
      ...overrides.transactionManager,
    } as unknown as TransactionManager;

    return {
      service: new InstrumentOnboardingService(
        providerConfigRepository,
        instrumentRepository,
        instrumentAliasRepository,
        exchangeRepository,
        transactionManager,
      ),
      providerConfigRepository,
      instrumentRepository,
      instrumentAliasRepository,
      exchangeRepository,
    };
  }

  it("throws when the provider configuration does not exist", async () => {
    const { service } = buildService({
      providerConfigRepository: {
        findById: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.onboard({
        providerConfigId: "provider-1",
        providerSymbol: "AAPL",
        name: "Apple Inc",
        assetClass: "EQUITY",
        currency: "USD",
        exchangeCode: "XNAS",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws when the provider configuration is inactive", async () => {
    const { service } = buildService({
      providerConfigRepository: {
        findById: jest.fn().mockResolvedValue({
          ...providerConfig,
          isActive: false,
        }),
      },
    });

    await expect(
      service.onboard({
        providerConfigId: "provider-1",
        providerSymbol: "AAPL",
        name: "Apple Inc",
        assetClass: "EQUITY",
        currency: "USD",
        exchangeCode: "XNAS",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws when an exchange is required but not supplied", async () => {
    const { service } = buildService();

    await expect(
      service.onboard({
        providerConfigId: "provider-1",
        providerSymbol: "AAPL",
        name: "Apple Inc",
        assetClass: "EQUITY",
        currency: "USD",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when the supplied exchange does not exist", async () => {
    const { service } = buildService({
      exchangeRepository: {
        findByCode: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(
      service.onboard({
        providerConfigId: "provider-1",
        providerSymbol: "AAPL",
        name: "Apple Inc",
        assetClass: "EQUITY",
        currency: "USD",
        exchangeCode: "XNAS",
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it("accepts decentralized commodities without an exchange", async () => {
    const { service, instrumentRepository } = buildService();

    await expect(
      service.onboard({
        providerConfigId: "provider-1",
        providerSymbol: "XAG/USD",
        name: "Silver Spot",
        assetClass: "COMMODITY",
        currency: "USD",
      }),
    ).resolves.toEqual(instrument);

    expect(instrumentRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        exchangeId: null,
        symbol: "XAG/USD",
        assetClass: "COMMODITY",
      }),
      expect.anything(),
    );
  });
});
