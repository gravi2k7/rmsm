import type { Env } from "@rmsm/config";
import { YahooFinanceRegistrarService } from "../yahoo-finance.module";
import { ProviderRegistryService } from "../../provider-registry.service";
import { ProviderFactoryService } from "../../provider-factory.service";
import { YahooFinanceProvider } from "../yahoo-finance.provider";
import type { YahooFinanceCacheService } from "../yahoo-finance.cache";
import type { MarketDataProviderConfigModel } from "../../../interfaces/models/reference-data.models";
import { YAHOO_DEFAULT_REQUESTS_PER_MINUTE } from "../yahoo-finance.constants";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    YAHOO_ENABLED: true,
    YAHOO_CACHE_TTL: 300,
    YAHOO_TIMEOUT: 10_000,
    YAHOO_RETRY_COUNT: 3,
    ...overrides,
  } as Env;
}

function buildConfigRow(overrides: Partial<MarketDataProviderConfigModel> = {}): MarketDataProviderConfigModel {
  return {
    id: "cfg-1",
    type: "YAHOO_FINANCE",
    name: "Yahoo Finance (org override)",
    baseUrl: null,
    credentialReference: null,
    rateLimitPerMinute: null,
    supportedAssetClasses: ["EQUITY"],
    isActive: true,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function fakeCache(): YahooFinanceCacheService {
  return { getOrSet: jest.fn((_key: string, _ttlMs: number, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as YahooFinanceCacheService;
}

describe("YahooFinanceRegistrarService", () => {
  let registry: ProviderRegistryService;
  let factory: ProviderFactoryService;

  beforeEach(() => {
    registry = new ProviderRegistryService();
    factory = new ProviderFactoryService();
  });

  it("registers a YahooFinanceProvider with the ProviderRegistry on module init", () => {
    const registrar = new YahooFinanceRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const registered = registry.tryGet("YAHOO_FINANCE");
    expect(registered).toBeInstanceOf(YahooFinanceProvider);
    expect(registered!.enabled).toBe(true);
  });

  it("registers a disabled provider (still present in the registry) when YAHOO_ENABLED=false", () => {
    const registrar = new YahooFinanceRegistrarService(registry, factory, fakeCache(), buildEnv({ YAHOO_ENABLED: false }));
    registrar.onModuleInit();

    expect(registry.tryGet("YAHOO_FINANCE")!.enabled).toBe(false);
  });

  it("registers a builder with ProviderFactory — factory.create() resolves Yahoo Finance with no switch statement involved", () => {
    const registrar = new YahooFinanceRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow());

    expect(built).toBeInstanceOf(YahooFinanceProvider);
    expect(built.type).toBe("YAHOO_FINANCE");
  });

  it("factory.create() honors a config row's rateLimitPerMinute override instead of the default", () => {
    const registrar = new YahooFinanceRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow({ rateLimitPerMinute: 45 }));

    expect(built.metadata.rateLimits.requestsPerMinute).toBe(45);
  });

  it("falls back to YAHOO_DEFAULT_REQUESTS_PER_MINUTE when no config row override is present", () => {
    const registrar = new YahooFinanceRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow());

    expect(built.metadata.rateLimits.requestsPerMinute).toBe(YAHOO_DEFAULT_REQUESTS_PER_MINUTE);
  });

  it(
    "shares the same injected YahooFinanceCacheService instance across every provider it builds, rather than opening a new Redis connection per build",
    async () => {
      // Mocked so this test fails fast on a deterministic network error
      // instead of attempting a real HTTP call — the assertion only cares
      // that BOTH built instances routed their quote fetch through the one
      // shared cache mock.
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error("not mocked in this test")) as unknown as typeof fetch;

      const cache = fakeCache();
      const registrar = new YahooFinanceRegistrarService(registry, factory, cache, buildEnv({ YAHOO_RETRY_COUNT: 0 }));
      registrar.onModuleInit();

      const built1 = factory.create(buildConfigRow());
      const built2 = factory.create(buildConfigRow({ id: "cfg-2" }));

      await Promise.allSettled([built1.quoteClient!.fetchLatestQuote("AAPL"), built2.quoteClient!.fetchLatestQuote("AAPL")]);

      expect(cache.getOrSet).toHaveBeenCalledTimes(2);

      global.fetch = originalFetch;
    },
    15_000,
  );
});
