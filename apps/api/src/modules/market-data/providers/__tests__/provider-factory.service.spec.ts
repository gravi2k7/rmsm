import { ProviderFactoryService } from "../provider-factory.service";
import type { MarketDataProvider } from "../../interfaces/market-data-provider.interface";
import type { MarketDataProviderConfigModel } from "../../interfaces/models/reference-data.models";

describe("ProviderFactoryService", () => {
  let factory: ProviderFactoryService;

  const config: MarketDataProviderConfigModel = {
    id: "cfg1",
    type: "POLYGON",
    name: "Polygon",
    baseUrl: null,
    credentialReference: null,
    rateLimitPerMinute: null,
    supportedAssetClasses: ["EQUITY"],
    isActive: true,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    factory = new ProviderFactoryService();
  });

  it("throws a clear error when no builder is registered for the requested type", () => {
    expect(() => factory.create(config)).toThrow('No provider builder registered for type "POLYGON"');
  });

  it("dispatches to the registered builder for that type, via Map lookup — no switch statement involved", () => {
    const built = {} as MarketDataProvider;
    const builder = jest.fn().mockReturnValue(built);
    factory.registerBuilder("POLYGON", builder);

    const result = factory.create(config);

    expect(builder).toHaveBeenCalledWith(config);
    expect(result).toBe(built);
  });

  it("does not call a builder registered for a different type", () => {
    const polygonBuilder = jest.fn().mockReturnValue({} as MarketDataProvider);
    const binanceBuilder = jest.fn().mockReturnValue({} as MarketDataProvider);
    factory.registerBuilder("POLYGON", polygonBuilder);
    factory.registerBuilder("BINANCE", binanceBuilder);

    factory.create(config);

    expect(polygonBuilder).toHaveBeenCalled();
    expect(binanceBuilder).not.toHaveBeenCalled();
  });

  it("re-registering a builder for the same type replaces the previous one", () => {
    const firstBuilder = jest.fn().mockReturnValue({ type: "first" } as unknown as MarketDataProvider);
    const secondBuilder = jest.fn().mockReturnValue({ type: "second" } as unknown as MarketDataProvider);
    factory.registerBuilder("POLYGON", firstBuilder);
    factory.registerBuilder("POLYGON", secondBuilder);

    const result = factory.create(config);

    expect(firstBuilder).not.toHaveBeenCalled();
    expect(secondBuilder).toHaveBeenCalled();
    expect(result).toEqual({ type: "second" });
  });
});
