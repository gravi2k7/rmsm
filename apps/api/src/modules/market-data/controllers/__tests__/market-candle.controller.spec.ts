import { BadRequestException } from "@nestjs/common";
import { MarketCandleController } from "../market-candle.controller";
import type { MarketDataService } from "../../services/market-data.service";
import type { CandleQueryDto } from "../../dto/candle-query.dto";

describe("MarketCandleController", () => {
  function buildController(overrides: Partial<MarketDataService> = {}) {
    const marketDataService = {
      getCandles: jest.fn().mockResolvedValue([]),
      getInstrumentByExchangeAndSymbol: jest.fn(),
      ...overrides,
    } as unknown as MarketDataService;
    return { controller: new MarketCandleController(marketDataService), marketDataService };
  }

  const baseQuery = { interval: "ONE_DAY" as const, from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z", limit: 500 };

  it("uses instrumentId directly when provided", async () => {
    const { controller, marketDataService } = buildController();
    await controller.list({ ...baseQuery, instrumentId: "inst1" } as CandleQueryDto);
    expect(marketDataService.getCandles).toHaveBeenCalledWith("inst1", "ONE_DAY", expect.any(Date), expect.any(Date), 500);
    expect(marketDataService.getInstrumentByExchangeAndSymbol).not.toHaveBeenCalled();
  });

  it("resolves via exchangeId + symbol when instrumentId is absent", async () => {
    const { controller, marketDataService } = buildController({
      getInstrumentByExchangeAndSymbol: jest.fn().mockResolvedValue({ id: "resolved-inst" }),
    });
    await controller.list({ ...baseQuery, exchangeId: "ex1", symbol: "AAPL" } as CandleQueryDto);
    expect(marketDataService.getInstrumentByExchangeAndSymbol).toHaveBeenCalledWith("ex1", "AAPL");
    expect(marketDataService.getCandles).toHaveBeenCalledWith("resolved-inst", "ONE_DAY", expect.any(Date), expect.any(Date), 500);
  });

  it("throws BadRequestException when neither instrumentId nor a complete exchangeId+symbol pair is given", async () => {
    const { controller } = buildController();
    await expect(controller.list({ ...baseQuery, exchangeId: "ex1" } as CandleQueryDto)).rejects.toThrow(BadRequestException);
  });

  it("prefers instrumentId over exchangeId+symbol when both are somehow present", async () => {
    const { controller, marketDataService } = buildController();
    await controller.list({ ...baseQuery, instrumentId: "inst1", exchangeId: "ex1", symbol: "AAPL" } as CandleQueryDto);
    expect(marketDataService.getInstrumentByExchangeAndSymbol).not.toHaveBeenCalled();
  });
});
