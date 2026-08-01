import { GapDetectionService } from "../gap-detection.service";
import type { MarketCandleRepository } from "../../repositories/market-candle.repository";
import type { DataGapRepository } from "../../repositories/data-gap.repository";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import type { MarketDataStreamPublisherService } from "../market-data-stream-publisher.service";
import type { MarketCandleModel } from "../../interfaces/models/time-series.models";

function candle(eventTime: string): Partial<MarketCandleModel> {
  return { eventTime: new Date(eventTime) };
}

function buildService(candles: Partial<MarketCandleModel>[], overlapping: unknown[] = []) {
  const candleRepository = {
    findRangeCurrentValues: jest.fn().mockResolvedValue(candles),
  } as unknown as MarketCandleRepository;
  const gapRepository = {
    findOverlapping: jest.fn().mockResolvedValue(overlapping),
    create: jest.fn().mockImplementation(async (data) => ({ id: "gap1", status: "DETECTED", detectedAt: new Date(), backfilledAt: null, repairedByProviderId: null, repairAttempts: 0, ...data })),
  } as unknown as DataGapRepository;
  const eventPublisher = { publish: jest.fn() } as unknown as DomainEventPublisher;
  const streamPublisher = { publish: jest.fn().mockResolvedValue(undefined) } as unknown as MarketDataStreamPublisherService;
  const service = new GapDetectionService(candleRepository, gapRepository, eventPublisher, streamPublisher);
  return { service, gapRepository, eventPublisher, streamPublisher };
}

describe("GapDetectionService", () => {
  it("detects no gaps for evenly-spaced hourly candles", async () => {
    const candles = [candle("2026-01-05T10:00:00Z"), candle("2026-01-05T11:00:00Z"), candle("2026-01-05T12:00:00Z")];
    const { service, gapRepository } = buildService(candles);

    const result = await service.detectGaps("inst1", "ONE_HOUR", new Date("2026-01-05T00:00:00Z"), new Date("2026-01-05T23:00:00Z"));

    expect(result).toHaveLength(0);
    expect(gapRepository.create).not.toHaveBeenCalled();
  });

  it("records a gap for a real missing weekday span", async () => {
    // Wednesday 10:00 to Wednesday 16:00 with a 4-hour hole in the middle.
    const candles = [candle("2026-01-07T10:00:00Z"), candle("2026-01-07T16:00:00Z")];
    const { service, gapRepository, eventPublisher, streamPublisher } = buildService(candles);

    const result = await service.detectGaps("inst1", "ONE_HOUR", new Date("2026-01-07T00:00:00Z"), new Date("2026-01-07T23:00:00Z"));

    expect(result).toHaveLength(1);
    expect(gapRepository.create).toHaveBeenCalledWith({
      instrumentId: "inst1",
      interval: "ONE_HOUR",
      gapStart: new Date("2026-01-07T11:00:00Z"),
      gapEnd: new Date("2026-01-07T16:00:00Z"),
    });
    expect(eventPublisher.publish).toHaveBeenCalledWith("GapDetected", expect.objectContaining({ instrumentId: "inst1" }));
    expect(streamPublisher.publish).toHaveBeenCalled();
  });

  it("skips a gap that is entirely a weekend when respectWeekends is true", async () => {
    // Friday close to Monday open — a Sat/Sun-only gap.
    const candles = [candle("2026-01-02T21:00:00Z"), candle("2026-01-05T09:00:00Z")];
    const { service, gapRepository } = buildService(candles);

    const result = await service.detectGaps("inst1", "ONE_HOUR", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-06T00:00:00Z"), {
      respectWeekends: true,
    });

    expect(result).toHaveLength(0);
    expect(gapRepository.create).not.toHaveBeenCalled();
  });

  it("does not create a duplicate gap when an overlapping one already exists", async () => {
    const candles = [candle("2026-01-07T10:00:00Z"), candle("2026-01-07T16:00:00Z")];
    const { service, gapRepository } = buildService(candles, [{ id: "existing-gap" }]);

    const result = await service.detectGaps("inst1", "ONE_HOUR", new Date("2026-01-07T00:00:00Z"), new Date("2026-01-07T23:00:00Z"));

    expect(result).toHaveLength(0);
    expect(gapRepository.create).not.toHaveBeenCalled();
  });
});
