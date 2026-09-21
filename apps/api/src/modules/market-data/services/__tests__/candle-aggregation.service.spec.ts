import { CandleInterval, MarketDataSource } from "@rmsm/database";
import { CandleAggregationService } from "../candle-aggregation.service";
import type { MarketCandleModel } from "../../interfaces/models/time-series.models";

describe("CandleAggregationService", () => {
  const service = new CandleAggregationService();

  const makeCandle = (
    minute: number,
    open: string,
    high: string,
    low: string,
    close: string,
    volume: string,
  ): MarketCandleModel => ({
    id: `candle-${minute}`,
    instrumentId: "instrument-1",
    interval: CandleInterval.ONE_MINUTE,
    eventTime: new Date(
      `2026-09-20T10:${String(minute).padStart(2, "0")}:00.000Z`,
    ),
    open,
    high,
    low,
    close,
    volume,
    providerId: "provider-1",
    source: MarketDataSource.LIVE,
    receivedAt: new Date(),
    importJobId: null,
    sourceTimestamp: null,
    normalizationVersion: 1,
    isCorrection: false,
    supersedesId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("aggregates a complete 5-minute candle", () => {
    const candles = [
      makeCandle(0, "100.10", "101.20", "99.90", "100.80", "2"),
      makeCandle(1, "100.80", "102.40", "100.50", "102.00", "3"),
      makeCandle(2, "102.00", "103.10", "101.70", "102.80", "4"),
      makeCandle(3, "102.80", "102.90", "100.20", "100.50", "5"),
      makeCandle(4, "100.50", "101.00", "99.80", "100.20", "6"),
    ];

    const result = service.aggregateFromOneMinute(
      candles,
      CandleInterval.FIVE_MINUTES,
      new Date("2026-09-20T10:00:00.000Z"),
    );

    expect(result).toMatchObject({
      interval: CandleInterval.FIVE_MINUTES,
      eventTime: new Date("2026-09-20T10:00:00.000Z"),
      open: "100.10",
      high: "103.10",
      low: "99.80",
      close: "100.20",
      volume: "20",
      providerId: "provider-1",
    });
  });

  it("rejects incomplete source coverage", () => {
    const candles = [
      makeCandle(0, "100", "101", "99", "100", "1"),
      makeCandle(1, "100", "101", "99", "100", "1"),
      makeCandle(2, "100", "101", "99", "100", "1"),
      makeCandle(4, "100", "101", "99", "100", "1"),
    ];

    expect(
      service.aggregateFromOneMinute(
        candles,
        CandleInterval.FIVE_MINUTES,
        new Date("2026-09-20T10:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("rejects mixed provider source candles", () => {
    const candles = Array.from({ length: 5 }, (_, minute) =>
      makeCandle(minute, "100", "101", "99", "100", "1"),
    );

    candles[3]!.providerId = "provider-2";

    expect(
      service.aggregateFromOneMinute(
        candles,
        CandleInterval.FIVE_MINUTES,
        new Date("2026-09-20T10:00:00.000Z"),
      ),
    ).toBeNull();
  });

  it("does not use unsupported calendar intervals", () => {
    const candles = Array.from({ length: 60 }, (_, minute) =>
      makeCandle(minute, "100", "101", "99", "100", "1"),
    );

    expect(
      service.aggregateFromOneMinute(
        candles,
        CandleInterval.ONE_DAY,
        new Date("2026-09-20T00:00:00.000Z"),
      ),
    ).toBeNull();
  });
});
