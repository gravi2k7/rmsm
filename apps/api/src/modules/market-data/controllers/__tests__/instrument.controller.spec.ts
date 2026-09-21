import { InstrumentController } from "../instrument.controller";
import type { MarketDataService } from "../../services/market-data.service";
import type { InstrumentDiscoveryService } from "../../services/instrument-discovery.service";
import type { InstrumentOnboardingService } from "../../services/instrument-onboarding.service";
import type { InstrumentSearchDto } from "../../dto/instrument-search.dto";

describe("InstrumentController", () => {
  function buildController(overrides: Partial<MarketDataService> = {}) {
    const marketDataService = {
      searchInstruments: jest.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]),
      countInstruments: jest.fn().mockResolvedValue(2),
      getInstrument: jest.fn(),
      getInstrumentsByIds: jest.fn(),
      ...overrides,
    } as unknown as MarketDataService;

    const instrumentDiscoveryService = {
      searchProviderSymbols: jest.fn(),
    } as unknown as InstrumentDiscoveryService;

    const instrumentOnboardingService = {
      onboard: jest.fn(),
    } as unknown as InstrumentOnboardingService;

    return {
      controller: new InstrumentController(
        marketDataService,
        instrumentDiscoveryService,
        instrumentOnboardingService,
      ),
      marketDataService,
      instrumentDiscoveryService,
      instrumentOnboardingService,
    };
  }

  it("returns instruments for a comma-separated batch of ids", async () => {
    const instruments = [
      { id: "11111111-1111-4111-8111-111111111111", symbol: "EURUSD" },
      { id: "22222222-2222-4222-8222-222222222222", symbol: "NAS100" },
    ];

    const { controller, marketDataService } = buildController({
      getInstrumentsByIds: jest.fn().mockResolvedValue(instruments),
    });

    const result = await controller.batch(
      "11111111-1111-4111-8111-111111111111,22222222-2222-4222-8222-222222222222",
    );

    expect(marketDataService.getInstrumentsByIds).toHaveBeenCalledWith([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
    expect(result).toEqual(instruments);
  });

  it("deduplicates and trims batch ids", async () => {
    const { controller, marketDataService } = buildController({
      getInstrumentsByIds: jest.fn().mockResolvedValue([]),
    });

    await controller.batch(
      " 11111111-1111-4111-8111-111111111111,11111111-1111-4111-8111-111111111111 ",
    );

    expect(marketDataService.getInstrumentsByIds).toHaveBeenCalledWith([
      "11111111-1111-4111-8111-111111111111",
    ]);
  });

  it("rejects invalid batch instrument ids", async () => {
    const { controller } = buildController();

    await expect(controller.batch("not-a-uuid")).rejects.toThrow(
      "Invalid instrument id: not-a-uuid",
    );
  });

  it("returns an empty array when no batch ids are supplied", async () => {
    const { controller, marketDataService } = buildController();

    await expect(controller.batch()).resolves.toEqual([]);
    expect(marketDataService.getInstrumentsByIds).not.toHaveBeenCalled();
  });

  it("returns a paginated result with correct metadata", async () => {
    const { controller } = buildController();

    const result = await controller.list({
      query: "AAPL",
      page: 1,
      pageSize: 50,
    } as InstrumentSearchDto);

    expect(result.data).toHaveLength(2);
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 50,
      totalCount: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it("does not pass exchangeId through to searchInstruments, even if present on the query DTO", async () => {
    const { controller, marketDataService } = buildController();

    await controller.list({
      query: "AAPL",
      exchangeId: "ex1",
      page: 1,
      pageSize: 25,
    } as InstrumentSearchDto);

    const filtersArg = (marketDataService.searchInstruments as jest.Mock).mock.calls[0][0];

    expect(filtersArg.exchangeId).toBeUndefined();
  });

  it("passes assetClass and status through to both searchInstruments and countInstruments consistently", async () => {
    const { controller, marketDataService } = buildController();

    await controller.list({
      assetClass: "EQUITY",
      status: "ACTIVE",
      page: 1,
      pageSize: 25,
    } as InstrumentSearchDto);

    expect(marketDataService.searchInstruments).toHaveBeenCalledWith(
      expect.objectContaining({
        assetClass: "EQUITY",
        status: "ACTIVE",
      }),
      expect.anything(),
    );

    expect(marketDataService.countInstruments).toHaveBeenCalledWith({
      assetClass: "EQUITY",
      status: "ACTIVE",
    });
  });

  it("computes hasNextPage correctly across multiple pages", async () => {
    const { controller } = buildController({
      countInstruments: jest.fn().mockResolvedValue(120),
    });

    const result = await controller.list({
      page: 1,
      pageSize: 50,
    } as InstrumentSearchDto);

    expect(result.pagination.totalPages).toBe(3);
    expect(result.pagination.hasNextPage).toBe(true);
  });
});
