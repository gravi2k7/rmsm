import { InstrumentController } from "../instrument.controller";
import type { MarketDataService } from "../../services/market-data.service";
import type { InstrumentSearchDto } from "../../dto/instrument-search.dto";

describe("InstrumentController", () => {
  function buildController(overrides: Partial<MarketDataService> = {}) {
    const marketDataService = {
      searchInstruments: jest.fn().mockResolvedValue([{ id: "1" }, { id: "2" }]),
      countInstruments: jest.fn().mockResolvedValue(2),
      getInstrument: jest.fn(),
      ...overrides,
    } as unknown as MarketDataService;

    return {
      controller: new InstrumentController(marketDataService),
      marketDataService,
    };
  }

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
