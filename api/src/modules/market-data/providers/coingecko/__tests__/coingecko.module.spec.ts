import type { Env } from "@rmsm/config";
import { CoinGeckoRegistrarService } from "../coingecko.module";
import { ProviderRegistryService } from "../../provider-registry.service";
import { ProviderFactoryService } from "../../provider-factory.service";
import { CoinGeckoProvider } from "../coingecko.provider";
import type { CoinGeckoCacheService } from "../coingecko.cache";
import type { MarketDataProviderConfigModel } from "../../../interfaces/models/reference-data.models";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    COINGECKO_API_KEY: undefined,
    COINGECKO_BASE_URL: "https://api.coingecko.com/api/v3",
    ...overrides,
  } as Env;
}

function buildConfigRow(overrides: Partial<MarketDataProviderConfigModel> = {}): MarketDataProviderConfigModel {
  return {
    id: "cfg-1",
    type: "COINGECKO",
    name: "CoinGecko (org override)",
    baseUrl: null,
    credentialReference: null,
    rateLimitPerMinute: null,
    supportedAssetClasses: ["CRYPTO"],
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

function fakeCache(): CoinGeckoCacheService {
  return { getOrSet: jest.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()) } as unknown as CoinGeckoCacheService;
}

describe("CoinGeckoRegistrarService", () => {
  let registry: ProviderRegistryService;
  let factory: ProviderFactoryService;

  beforeEach(() => {
    registry = new ProviderRegistryService();
    factory = new ProviderFactoryService();
  });

  it("registers a CoinGeckoProvider with the ProviderRegistry on module init", () => {
    const registrar = new CoinGeckoRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const registered = registry.tryGet("COINGECKO");
    expect(registered).toBeInstanceOf(CoinGeckoProvider);
    expect(registered!.enabled).toBe(true);
  });

  it("ProviderRegistry.listEnabled() lists COINGECKO even with no API key configured (public tier still works)", () => {
    const registrar = new CoinGeckoRegistrarService(registry, factory, fakeCache(), buildEnv({ COINGECKO_API_KEY: undefined }));
    registrar.onModuleInit();

    expect(registry.listEnabled()).toContain("COINGECKO");
  });

  it("registers a builder with ProviderFactory — factory.create() resolves CoinGecko with no switch statement involved", () => {
    const registrar = new CoinGeckoRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow());

    expect(built).toBeInstanceOf(CoinGeckoProvider);
    expect(built.type).toBe("COINGECKO");
  });

  it("factory.create() honors a config row's rateLimitPerMinute override instead of the default 30/min", () => {
    const registrar = new CoinGeckoRegistrarService(registry, factory, fakeCache(), buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow({ rateLimitPerMinute: 60 }));

    expect(built.metadata.rateLimits.requestsPerMinute).toBe(60);
  });

  it("shares the same injected CoinGeckoCacheService instance across every provider it builds, rather than opening a new Redis connection per build", async () => {
    const cache = fakeCache();
    const registrar = new CoinGeckoRegistrarService(registry, factory, cache, buildEnv());
    registrar.onModuleInit();

    const built1 = factory.create(buildConfigRow());
    const built2 = factory.create(buildConfigRow({ id: "cfg-2" }));

    // getOrSet's fetcher will reject (no real HTTP call is mocked here) —
    // that's fine, this test only cares that BOTH built instances routed
    // their quote fetch through the one shared cache mock, not through two
    // independently-constructed cache services.
    await Promise.allSettled([built1.quoteClient!.fetchLatestQuote("BTC"), built2.quoteClient!.fetchLatestQuote("BTC")]);

    expect(cache.getOrSet).toHaveBeenCalledTimes(2);
  });
});
