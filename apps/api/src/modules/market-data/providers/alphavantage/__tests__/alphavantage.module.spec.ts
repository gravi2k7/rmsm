import type { Env } from "@rmsm/config";
import { AlphaVantageRegistrarService } from "../alphavantage.module";
import { ProviderRegistryService } from "../../provider-registry.service";
import { ProviderFactoryService } from "../../provider-factory.service";
import { AlphaVantageProvider } from "../alphavantage.provider";
import type { AlphaVantageCacheService } from "../alphavantage.cache";
import type { MarketDataProviderConfigModel } from "../../../interfaces/models/reference-data.models";
import { ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY } from "../alphavantage.constants";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    ALPHA_VANTAGE_API_KEY: "test-api-key",
    ALPHA_VANTAGE_BASE_URL: "https://www.alphavantage.co",
    ALPHA_VANTAGE_TIMEOUT: 10_000,
    ALPHA_VANTAGE_RATE_LIMIT: 5,
    MARKET_DATA_CACHE_TTL_MS: 5000,
    ...overrides,
  } as Env;
}

function buildConfigRow(overrides: Partial<MarketDataProviderConfigModel> = {}): MarketDataProviderConfigModel {
  return {
    id: "cfg-1",
    type: "ALPHA_VANTAGE",
    name: "Alpha Vantage (org override)",
    baseUrl: null,
    credentialReference: null,
    rateLimitPerMinute: null,
    supportedAssetClasses: ["EQUITY"],
    isActive: true,
    // FIP-001 additions to MarketDataProviderConfigModel.
    priority: 100,
    lastConnectionTestAt: null,
    lastConnectionTestStatus: null,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function fakeCache(): AlphaVantageCacheService {
  return { getOrSet: jest.fn((_key: string, _ttlMs: number, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as AlphaVantageCacheService;
}

describe("AlphaVantageRegistrarService", () => {
  let registry: ProviderRegistryService;
  let factory: ProviderFactoryService;

  beforeEach(() => {
    registry = new ProviderRegistryService();
    factory = new ProviderFactoryService();
  });

  it("registers an AlphaVantageProvider with the ProviderRegistry on module init", () => {
    const registrar = new AlphaVantageRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const registered = registry.tryGet("ALPHA_VANTAGE");
    expect(registered).toBeInstanceOf(AlphaVantageProvider);
    expect(registered!.enabled).toBe(true);
  });

  it("registers a disabled provider (still present in the registry) when no API key is configured", () => {
    const registrar = new AlphaVantageRegistrarService(registry, factory, fakeCache(), buildEnv({ ALPHA_VANTAGE_API_KEY: undefined }));
    registrar.onModuleInit();

    const registered = registry.tryGet("ALPHA_VANTAGE");
    expect(registered!.enabled).toBe(false);
  });

  it("registers a builder with ProviderFactory — factory.create() resolves Alpha Vantage with no switch statement involved", () => {
    const registrar = new AlphaVantageRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow());

    expect(built).toBeInstanceOf(AlphaVantageProvider);
    expect(built.type).toBe("ALPHA_VANTAGE");
  });

  it("factory.create() honors a config row's rateLimitPerMinute override for the minute dimension", () => {
    const registrar = new AlphaVantageRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow({ rateLimitPerMinute: 20 }));

    expect(built.metadata.rateLimits.requestsPerMinute).toBe(20);
  });

  it("does NOT let a config row's rateLimitPerMinute override affect the per-day ceiling (no DB-row field exists for it)", () => {
    const registrar = new AlphaVantageRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow({ rateLimitPerMinute: 20 }));

    expect(built.metadata.rateLimits.requestsPerDay).toBe(ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY);
  });

  it("falls back to ALPHA_VANTAGE_RATE_LIMIT from env, then the hardcoded default, when no config row override is present", () => {
    const registrar = new AlphaVantageRegistrarService(registry, factory, fakeCache(), buildEnv({ ALPHA_VANTAGE_RATE_LIMIT: 12 }));
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow());

    expect(built.metadata.rateLimits.requestsPerMinute).toBe(12);
  });

  it(
    "shares the same injected AlphaVantageCacheService instance across every provider it builds, rather than opening a new Redis connection per build",
    async () => {
      // Mocked so this test fails fast on a deterministic network error
      // instead of attempting a real HTTP call — the assertion only cares
      // that BOTH built instances routed their quote fetch through the one
      // shared cache mock, not through two independently-constructed cache
      // services, so what the fetch itself resolves to is irrelevant.
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error("not mocked in this test")) as unknown as typeof fetch;

      const cache = fakeCache();
      const registrar = new AlphaVantageRegistrarService(registry, factory, cache, buildEnv());
      registrar.onModuleInit();

      const built1 = factory.create(buildConfigRow());
      const built2 = factory.create(buildConfigRow({ id: "cfg-2" }));

      await Promise.allSettled([built1.quoteClient!.fetchLatestQuote("IBM"), built2.quoteClient!.fetchLatestQuote("IBM")]);

      expect(cache.getOrSet).toHaveBeenCalledTimes(2);

      global.fetch = originalFetch;
    },
    15_000,
  );
});
