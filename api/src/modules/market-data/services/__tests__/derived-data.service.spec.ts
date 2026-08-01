import { DerivedDataService } from "../derived-data.service";
import type { MarketCandleRepository } from "../../repositories/market-candle.repository";
import type { DerivedIndicatorSnapshotRepository } from "../../repositories/derived-indicator-snapshot.repository";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import type { MarketDataStreamPublisherService } from "../market-data-stream-publisher.service";
import type { MarketCandleModel } from "../../interfaces/models/time-series.models";

function buildCandles(count: number): Partial<MarketCandleModel>[] {
  return Array.from({ length: count }, (_, i) => ({
    eventTime: new Date(Date.UTC(2026, 0, 1, 0, i)),
    open: String(100 + i),
    high: String(101 + i),
    low: String(99 + i),
    close: String(100 + i),
    volume: "1000",
  }));
}

function buildService(candles: Partial<MarketCandleModel>[]) {
  const candleRepository = { findRangeCurrentValues: jest.fn().mockResolvedValue(candles) } as unknown as MarketCandleRepository;
  const snapshotRepository = { upsert: jest.fn().mockResolvedValue({}) } as unknown as DerivedIndicatorSnapshotRepository;
  const eventPublisher = { publish: jest.fn() } as unknown as DomainEventPublisher;
  const streamPublisher = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as MarketDataStreamPublisherService;
  const service = new DerivedDataService(candleRepository, snapshotRepository, eventPublisher, streamPublisher);
  return { service, snapshotRepository, eventPublisher, streamPublisher };
}

describe("DerivedDataService", () => {
  it("writes nothing and does not publish when there are no candles", async () => {
    const { service, snapshotRepository, eventPublisher } = buildService([]);

    const written = await service.generateForInstrument("inst1", "ONE_HOUR");

    expect(written).toBe(0);
    expect(snapshotRepository.upsert).not.toHaveBeenCalled();
    expect(eventPublisher.publish).not.toHaveBeenCalled();
  });

  it("computes and persists indicators once there is enough history, and publishes DerivedDataGenerated", async () => {
    const { service, snapshotRepository, eventPublisher, streamPublisher } = buildService(buildCandles(60));

    const written = await service.generateForInstrument("inst1", "ONE_HOUR");

    expect(written).toBeGreaterThan(0);
    expect(snapshotRepository.upsert).toHaveBeenCalledWith(expect.objectContaining({ instrumentId: "inst1", indicatorKey: "sma" }));
    expect(eventPublisher.publish).toHaveBeenCalledWith("DerivedDataGenerated", expect.objectContaining({ instrumentId: "inst1" }));
    expect(streamPublisher.publish).toHaveBeenCalledWith("market-data:stream:derived", "DerivedDataGenerated", expect.anything());
  });

  it("writes fewer indicators when there is only a small amount of history (long-lookback ones are skipped, not errored)", async () => {
    const { service, snapshotRepository } = buildService(buildCandles(5));

    const written = await service.generateForInstrument("inst1", "ONE_HOUR");

    expect(written).toBeGreaterThanOrEqual(0);
    // With only 5 bars, sma(20)/rsi(14)/macd/bollinger(20) all return null — pivot_points (needs >=2 bars) should still be written.
    expect(snapshotRepository.upsert).toHaveBeenCalledWith(expect.objectContaining({ indicatorKey: "pivot_points" }));
  });
});
