import type { Env } from "@rmsm/config";
import { TwelveDataRegistrarService } from "../twelve-data.module";
import { ProviderRegistryService } from "../../provider-registry.service";
import { ProviderFactoryService } from "../../provider-factory.service";
import { TwelveDataProvider } from "../twelve-data.provider";
import type { MarketDataProviderConfigModel } from "../../../interfaces/models/reference-data.models";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    TWELVE_DATA_API_KEY: "test-api-key",
    TWELVE_DATA_BASE_URL: "https://api.twelvedata.com",
    TWELVE_DATA_TIMEOUT: 10_000,
    TWELVE_DATA_RETRY_COUNT: 3,
    TWELVE_DATA_RETRY_DELAY: 500,
    ...overrides,
  } as Env;
}

function buildConfigRow(overrides: Partial<MarketDataProviderConfigModel> = {}): MarketDataProviderConfigModel {
  return {
    id: "cfg-1",
    type: "TWELVE_DATA",
    name: "Twelve Data (org override)",
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

describe("TwelveDataRegistrarService", () => {
  let registry: ProviderRegistryService;
  let factory: ProviderFactoryService;

  beforeEach(() => {
    registry = new ProviderRegistryService();
    factory = new ProviderFactoryService();
  });

  it("registers a TwelveDataProvider with the ProviderRegistry on module init", () => {
    const registrar = new TwelveDataRegistrarService(registry, factory, buildEnv());
    registrar.onModuleInit();

    const registered = registry.tryGet("TWELVE_DATA");
    expect(registered).not.toBeNull();
    expect(registered).toBeInstanceOf(TwelveDataProvider);
    expect(registered!.enabled).toBe(true);
  });

  it("ProviderRegistry.listEnabled() lists TWELVE_DATA once registered with an API key", () => {
    const registrar = new TwelveDataRegistrarService(registry, factory, buildEnv());
    registrar.onModuleInit();

    expect(registry.listEnabled()).toContain("TWELVE_DATA");
  });

  it("registers a builder with ProviderFactory — factory.create() resolves Twelve Data with no switch statement involved", () => {
    const registrar = new TwelveDataRegistrarService(registry, factory, buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow());

    expect(built).toBeInstanceOf(TwelveDataProvider);
    expect(built.type).toBe("TWELVE_DATA");
  });

  it("factory.create() honors a config row's rateLimitPerMinute override instead of the env default", () => {
    const registrar = new TwelveDataRegistrarService(registry, factory, buildEnv());
    registrar.onModuleInit();

    const built = factory.create(buildConfigRow({ rateLimitPerMinute: 55 }));

    expect(built.metadata.rateLimits.requestsPerMinute).toBe(55);
  });

  it("factory.create() honors a config row's baseUrl override over the env default — verified via the actual outbound request URL", async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ symbol: "AAPL", close: "1.00", status: "ok" }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const registrar = new TwelveDataRegistrarService(registry, factory, buildEnv({ TWELVE_DATA_BASE_URL: "https://env-default.example.com" }));
      registrar.onModuleInit();

      const built = factory.create(buildConfigRow({ baseUrl: "https://org-specific.example.com" }));
      await built.quoteClient!.fetchLatestQuote("AAPL");

      const [calledUrl] = fetchMock.mock.calls[0] as [string];
      expect(new URL(calledUrl).origin).toBe("https://org-specific.example.com");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("falls back to the TWELVE_DATA_BASE_URL env default when a config row has no baseUrl override", async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ symbol: "AAPL", close: "1.00", status: "ok" }) });
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const registrar = new TwelveDataRegistrarService(registry, factory, buildEnv({ TWELVE_DATA_BASE_URL: "https://env-default.example.com" }));
      registrar.onModuleInit();

      const built = factory.create(buildConfigRow({ baseUrl: null }));
      await built.quoteClient!.fetchLatestQuote("AAPL");

      const [calledUrl] = fetchMock.mock.calls[0] as [string];
      expect(new URL(calledUrl).origin).toBe("https://env-default.example.com");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("registers the provider disabled (not throwing) when TWELVE_DATA_API_KEY is absent", () => {
    const registrar = new TwelveDataRegistrarService(registry, factory, buildEnv({ TWELVE_DATA_API_KEY: undefined }));

    expect(() => registrar.onModuleInit()).not.toThrow();

    const registered = registry.tryGet("TWELVE_DATA");
    expect(registered!.enabled).toBe(false);
    expect(registry.listEnabled()).not.toContain("TWELVE_DATA");
  });
});
