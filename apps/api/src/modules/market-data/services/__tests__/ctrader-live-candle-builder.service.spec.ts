import { CandleInterval, MarketDataSource } from "@rmsm/database";
import { CTraderLiveCandleBuilderService } from "../ctrader-live-candle-builder.service";

describe("CTraderLiveCandleBuilderService", () => {
  const listeners = new Map<string, (...args: any[]) => void>();

  const client: {
    on: jest.Mock;
  } = {
    on: jest.fn((event: string, listener: (...args: any[]) => void) => {
      listeners.set(event, listener);
      return client;
    }),
  };

  const providerConfigRepository = {
    findByType: jest.fn(),
  };

  const aliases = {
    findByProvider: jest.fn(),
  };

  const candles = {
    upsert: jest.fn().mockResolvedValue({
      id: "candle-1",
    }),
  };

  const streamPublisher = {
    publishCandle: jest.fn(),
  };

  let service: CTraderLiveCandleBuilderService;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners.clear();

    providerConfigRepository.findByType.mockResolvedValue({
      id: "provider-1",
      type: "CTRADER",
      name: "cTrader",
      isActive: true,
    });

    aliases.findByProvider.mockResolvedValue([
      {
        instrumentId: "instrument-1",
        providerId: "provider-1",
        providerSymbol: "XAUUSD",
      },
    ]);

    service = new CTraderLiveCandleBuilderService(
      client as never,
      providerConfigRepository as never,
      aliases as never,
      candles as never,
      streamPublisher as never,
    );

    service.onModuleInit();
  });

  async function loadContext(): Promise<void> {
    listeners.get("loggedOn")!();

    await new Promise<void>((resolve) => setImmediate(resolve));
  }

  function emitQuote(
    eventTime: string,
    lastPrice: string,
    bidSize = "1",
    askSize = "1",
  ): void {
    listeners.get("quote")!({
      providerSymbol: "XAUUSD",
      bidPrice: lastPrice,
      askPrice: String(Number(lastPrice) + 0.2),
      lastPrice,
      bidSize,
      askSize,
      eventTime: new Date(eventTime),
    });
  }

  it("builds OHLC entirely in memory while the candle is open", async () => {
    await loadContext();

    emitQuote("2026-09-18T05:00:10.000Z", "3650.00");
    emitQuote("2026-09-18T05:00:20.000Z", "3652.00");
    emitQuote("2026-09-18T05:00:40.000Z", "3648.00");

    expect(candles.upsert).not.toHaveBeenCalled();

    const oneMinuteEvents =
      streamPublisher.publishCandle.mock.calls.filter(
        ([payload]) =>
          payload.interval === CandleInterval.ONE_MINUTE,
      );

    expect(oneMinuteEvents).toHaveLength(3);

    const latest = oneMinuteEvents[2][0];

    expect(latest).toMatchObject({
      instrumentId: "instrument-1",
      providerSymbol: "XAUUSD",
      interval: CandleInterval.ONE_MINUTE,
      open: "3650.00",
      high: "3652.00",
      low: "3648.00",
      close: "3648.00",
      providerId: "provider-1",
      source: MarketDataSource.LIVE,
    });
  });

  it("persists the completed 1-minute candle when the next minute begins", async () => {
    await loadContext();

    emitQuote("2026-09-18T05:00:10.000Z", "3650.00");
    emitQuote("2026-09-18T05:00:20.000Z", "3652.00");
    emitQuote("2026-09-18T05:00:40.000Z", "3648.00");

    expect(candles.upsert).not.toHaveBeenCalled();

    emitQuote("2026-09-18T05:01:01.000Z", "3651.00");

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(candles.upsert).toHaveBeenCalledTimes(1);

    expect(candles.upsert).toHaveBeenCalledWith({
      instrumentId: "instrument-1",
      interval: CandleInterval.ONE_MINUTE,
      eventTime: new Date("2026-09-18T05:00:00.000Z"),
      open: "3650.00",
      high: "3652.00",
      low: "3648.00",
      close: "3648.00",
      volume: "3",
      providerId: "provider-1",
      source: MarketDataSource.LIVE,
      sourceTimestamp: undefined,
    });
  });

  it("never persists higher-timeframe candles from the live tick path", async () => {
    await loadContext();

    emitQuote("2026-09-18T05:00:10.000Z", "3650.00");
    emitQuote("2026-09-18T05:01:01.000Z", "3651.00");
    emitQuote("2026-09-18T05:05:01.000Z", "3655.00");

    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(candles.upsert).toHaveBeenCalled();

    for (const [payload] of candles.upsert.mock.calls) {
      expect(payload.interval).toBe(CandleInterval.ONE_MINUTE);
    }
  });

  it("loads provider and aliases once instead of querying on every quote", async () => {
    await loadContext();

    emitQuote("2026-09-18T05:00:10.000Z", "3650.00");
    emitQuote("2026-09-18T05:00:20.000Z", "3651.00");
    emitQuote("2026-09-18T05:00:30.000Z", "3652.00");

    expect(providerConfigRepository.findByType).toHaveBeenCalledTimes(1);
    expect(aliases.findByProvider).toHaveBeenCalledTimes(1);
  });

  it("publishes higher-timeframe candles without persisting them", async () => {
    await loadContext();

    emitQuote("2026-09-18T05:00:10.000Z", "3650.00");
    emitQuote("2026-09-18T05:00:20.000Z", "3652.00");

    const intervals = new Set(
      streamPublisher.publishCandle.mock.calls.map(
        ([payload]) => payload.interval,
      ),
    );

    expect(intervals).toEqual(
      new Set([
        CandleInterval.ONE_MINUTE,
        CandleInterval.FIVE_MINUTES,
        CandleInterval.FIFTEEN_MINUTES,
        CandleInterval.THIRTY_MINUTES,
        CandleInterval.ONE_HOUR,
        CandleInterval.FOUR_HOURS,
        CandleInterval.ONE_DAY,
      ]),
    );

    expect(candles.upsert).not.toHaveBeenCalled();
  });
});
