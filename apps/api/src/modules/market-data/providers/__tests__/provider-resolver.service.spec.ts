import { ProviderResolverService } from "../provider-resolver.service";
import type { ProviderRegistryService } from "../provider-registry.service";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { ProviderMetadata } from "../../interfaces/provider-metadata.interface";
import type { MarketDataProviderType } from "@rmsm/database";

function fakeProvider(type: string, overrides: Partial<ProviderMetadata> = {}, enabled = true): MarketDataProvider {
  return {
    type: type as never,
    enabled,
    metadata: {
      name: type,
      version: "1.0.0",
      marketsSupported: ["NASDAQ"],
      assetClasses: ["EQUITY"],
      timeframes: ["ONE_DAY"],
      supportsHistorical: true,
      supportsQuotes: true,
      supportsTicks: false,
      supportsStreaming: false,
      supportsCorporateActions: false,
      rateLimits: {},
      healthStatus: "healthy",
      ...overrides,
    },
    rateLimitPolicy: { getWaitTimeMs: async () => 0, recordCall: () => undefined },
    errorMapper: { classify: () => "unknown", isRetryable: () => false },
  };
}

describe("ProviderResolverService", () => {
  function buildResolver(providers: MarketDataProvider[]) {
    const registered = new Map(providers.map((p) => [p.type, p]));
    const registry = {
      tryGet: (type: MarketDataProviderType) => registered.get(type) ?? null,
      findByCapability: (predicate: (m: ProviderMetadata) => boolean) =>
        [...registered.values()].filter((p) => p.enabled && predicate(p.metadata)),
    } as unknown as ProviderRegistryService;
    return new ProviderResolverService(registry);
  }

  it("prefers the organization's explicit preference when it's enabled and supports the context", () => {
    const preferred = fakeProvider("POLYGON");
    const other = fakeProvider("BINANCE");
    const resolver = buildResolver([preferred, other]);

    const result = resolver.resolve({ organizationPreferredProviderType: "POLYGON" as never, assetClass: "EQUITY" });

    expect(result).toBe(preferred);
  });

  it("falls through to capability-based resolution when the preferred provider is disabled", () => {
    const preferred = fakeProvider("POLYGON", {}, false);
    const fallback = fakeProvider("BINANCE");
    const resolver = buildResolver([preferred, fallback]);

    const result = resolver.resolve({ organizationPreferredProviderType: "POLYGON" as never, assetClass: "EQUITY" });

    expect(result).toBe(fallback);
  });

  it("falls through when the preferred provider doesn't support the requested asset class", () => {
    const preferred = fakeProvider("POLYGON", { assetClasses: ["CRYPTO"] });
    const fallback = fakeProvider("BINANCE", { assetClasses: ["EQUITY"] });
    const resolver = buildResolver([preferred, fallback]);

    const result = resolver.resolve({ organizationPreferredProviderType: "POLYGON" as never, assetClass: "EQUITY" });

    expect(result).toBe(fallback);
  });

  it("resolves by asset class alone when no preference is given", () => {
    const cryptoOnly = fakeProvider("BINANCE", { assetClasses: ["CRYPTO"] });
    const equityCapable = fakeProvider("POLYGON", { assetClasses: ["EQUITY"] });
    const resolver = buildResolver([cryptoOnly, equityCapable]);

    const result = resolver.resolve({ assetClass: "EQUITY" });

    expect(result).toBe(equityCapable);
  });

  it("throws a clear error when no enabled provider matches the requested context", () => {
    const resolver = buildResolver([fakeProvider("POLYGON", { assetClasses: ["CRYPTO"] })]);
    expect(() => resolver.resolve({ assetClass: "EQUITY" })).toThrow("No enabled provider found matching the requested context");
  });
});
