import { InstrumentDiscoveryService } from "../instrument-discovery.service";
import { NotFoundError, ValidationError } from "@rmsm/shared";

describe("InstrumentDiscoveryService", () => {
  function buildService() {
    const providerConfigRepository = {
      findById: jest.fn(),
    };

    const providerRegistry = {
      get: jest.fn(),
    };

    const service = new InstrumentDiscoveryService(
      providerConfigRepository as never,
      providerRegistry as never,
    );

    return {
      service,
      providerConfigRepository,
      providerRegistry,
    };
  }

  it("searches the configured provider without writing anything", async () => {
    const {
      service,
      providerConfigRepository,
      providerRegistry,
    } = buildService();

    const search = jest.fn().mockResolvedValue([
      {
        providerSymbol: "XAU/USD",
        name: "Gold Spot",
        assetClass: "COMMODITY",
        currency: "USD",
      },
    ]);

    providerConfigRepository.findById.mockResolvedValue({
      id: "provider-1",
      type: "TWELVE_DATA",
      isActive: true,
    });

    providerRegistry.get.mockReturnValue({
      symbolSearchClient: { search },
    });

    const result = await service.searchProviderSymbols(
      "provider-1",
      "  XAU  ",
      10,
    );

    expect(search).toHaveBeenCalledWith("XAU", 10);
    expect(result).toEqual([
      {
        providerSymbol: "XAU/USD",
        name: "Gold Spot",
        assetClass: "COMMODITY",
        currency: "USD",
      },
    ]);
  });

  it("throws when the provider configuration does not exist", async () => {
    const { service, providerConfigRepository } = buildService();

    providerConfigRepository.findById.mockResolvedValue(null);

    await expect(
      service.searchProviderSymbols("missing", "XAU"),
    ).rejects.toThrow(NotFoundError);
  });

  it("throws when the provider does not expose symbol search", async () => {
    const {
      service,
      providerConfigRepository,
      providerRegistry,
    } = buildService();

    providerConfigRepository.findById.mockResolvedValue({
      id: "provider-1",
      type: "TWELVE_DATA",
      isActive: true,
    });

    providerRegistry.get.mockReturnValue({});

    await expect(
      service.searchProviderSymbols("provider-1", "XAU"),
    ).rejects.toThrow(ValidationError);
  });

  it("rejects an empty search query", async () => {
    const {
      service,
      providerConfigRepository,
      providerRegistry,
    } = buildService();

    providerConfigRepository.findById.mockResolvedValue({
      id: "provider-1",
      type: "TWELVE_DATA",
      isActive: true,
    });

    providerRegistry.get.mockReturnValue({
      symbolSearchClient: {
        search: jest.fn(),
      },
    });

    await expect(
      service.searchProviderSymbols("provider-1", "   "),
    ).rejects.toThrow(ValidationError);
  });
});
