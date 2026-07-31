import { MetaTrader5MarketService } from "../metatrader5.market.service";
import type { MetaTrader5Client } from "../metatrader5.client";
import type { BrokerHistoricalCandlesRequest } from "../../../interfaces/broker-models";

function buildClient(response: unknown): MetaTrader5Client {
  return { request: jest.fn().mockResolvedValue(response) } as unknown as MetaTrader5Client;
}

describe("MetaTrader5MarketService", () => {
  it("getQuote() computes spread = ask - bid and maps time -> eventTime", async () => {
    const client = buildClient({ symbol: "EURUSD", bid: 1.1000, ask: 1.1002, time: "2026-01-01T00:00:00.000Z" });
    const service = new MetaTrader5MarketService(client);

    const quote = await service.getQuote("EURUSD");

    expect(quote.bid).toBe(1.1);
    expect(quote.ask).toBe(1.1002);
    expect(quote.spread).toBeCloseTo(0.0002, 6);
    expect(quote.eventTime).toBeInstanceOf(Date);
  });

  it("getTick() maps bid/ask/last/volume/time", async () => {
    const client = buildClient({ symbol: "EURUSD", bid: 1.1, ask: 1.1002, last: 1.1001, volume: 12, time: "2026-01-01T00:00:00.000Z" });
    const service = new MetaTrader5MarketService(client);

    const tick = await service.getTick("EURUSD");

    expect(tick).toMatchObject({ symbol: "EURUSD", bid: 1.1, ask: 1.1002, last: 1.1001, volume: 12 });
  });

  it("getCandles() maps OHLCV candles and stamps the requested symbol/timeframe on each", async () => {
    const client = buildClient([
      { time: "2026-01-01T00:00:00.000Z", open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 },
      { time: "2026-01-02T00:00:00.000Z", open: 1.5, high: 2.5, low: 1, close: 2, volume: 150 },
    ]);
    const service = new MetaTrader5MarketService(client);
    const request: BrokerHistoricalCandlesRequest = { symbol: "EURUSD", timeframe: "D1", from: new Date("2026-01-01"), to: new Date("2026-01-03") };

    const candles = await service.getCandles(request);

    expect(candles).toHaveLength(2);
    expect(candles[0]).toMatchObject({ symbol: "EURUSD", timeframe: "D1", open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 });
  });

  it("getCandles() rejects an unsupported timeframe before calling the gateway", async () => {
    const client = buildClient([]);
    const service = new MetaTrader5MarketService(client);
    const request = { symbol: "EURUSD", timeframe: "M2" as never, from: new Date(), to: new Date() };

    await expect(service.getCandles(request)).rejects.toThrow(/does not support timeframe "M2"/);
    expect(client.request).not.toHaveBeenCalled();
  });

  it.each(["M1", "M5", "M15", "M30", "H1", "H4", "D1", "W1", "MN1"] as const)("accepts the supported timeframe %s", async (timeframe) => {
    const client = buildClient([]);
    const service = new MetaTrader5MarketService(client);

    await expect(service.getCandles({ symbol: "EURUSD", timeframe, from: new Date(), to: new Date() })).resolves.toEqual([]);
  });
});
