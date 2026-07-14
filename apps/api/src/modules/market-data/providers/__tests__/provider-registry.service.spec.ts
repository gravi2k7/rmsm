import { ProviderRegistryService } from "../provider-registry.service";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";

function fakeProvider(overrides: Partial<MarketDataProvider> = {}): MarketDataProvider {
  const metadata: ProviderMetadata = {
    name: "Fake",
    version: "1.0.0",
    marketsSupported: ["NASDAQ"],
    assetClasses: ["EQUITY"],
    timeframes: ["ONE_DAY"],
    supportsHistorical: true,
    supportsQuotes: false,
    supportsTicks: false,
    supportsStreaming: false,
    supportsCorporateActions: false,
    rateLimits: {},
    healthStatus: "healthy",
  };
  return {
    type: "POLYGON",
    enabled: true,
    metadata,
    rateLimitPolicy: { getWaitTimeMs: async () => 0, recordCall: () => undefined },
    errorMapper: { classify: () => "unknown", isRetryable: () => false },
    ...overrides,
  };
}

describe("ProviderRegistryService", () => {
  let registry: ProviderRegistryService;

  beforeEach(() => {
    registry = new ProviderRegistryService();
  });

  it("registers and retrieves a provider by type", () => {
    const provider = fakeProvider();
    registry.register(provider);
    expect(registry.get("POLYGON")).toBe(provider);
  });

  it("throws for an unregistered type", () => {
    expect(() => registry.get("BINANCE")).toThrow('No provider registered for type "BINANCE"');
  });

  it("throws for a registered-but-disabled provider", () => {
    registry.register(fakeProvider({ enabled: false }));
    expect(() => registry.get("POLYGON")).toThrow("registered but not enabled");
  });

  it("tryGet returns null instead of throwing for an unregistered type", () => {
    expect(registry.tryGet("BINANCE")).toBeNull();
  });

  it("listEnabled excludes disabled providers", () => {
    registry.register(fakeProvider({ type: "POLYGON", enabled: true }));
    registry.register(fakeProvider({ type: "BINANCE", enabled: false }));
    expect(registry.listEnabled()).toEqual(["POLYGON"]);
  });

  it("findByCapability filters by a predicate over metadata, excluding disabled providers", () => {
    registry.register(fakeProvider({ type: "POLYGON", enabled: true }));
    registry.register(
      fakeProvider({
        type: "BINANCE",
        enabled: true,
        metadata: { ...fakeProvider().metadata, supportsQuotes: true },
      }),
    );
    registry.register(fakeProvider({ type: "TWELVE_DATA", enabled: false, metadata: { ...fakeProvider().metadata, supportsQuotes: true } }));

    const results = registry.findByCapability((m) => m.supportsQuotes);
    expect(results.map((r) => r.type)).toEqual(["BINANCE"]);
  });

  it("getMetadata returns the provider's metadata", () => {
    const provider = fakeProvider();
    registry.register(provider);
    expect(registry.getMetadata("POLYGON")).toBe(provider.metadata);
  });
});
