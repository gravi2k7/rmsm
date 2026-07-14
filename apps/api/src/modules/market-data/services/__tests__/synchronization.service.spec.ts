import { SynchronizationService } from "../synchronization.service";
import type { MarketCandleRepository } from "../../repositories/market-candle.repository";
import type { HistoricalImportService } from "../historical-import.service";
import type { MarketCandleModel } from "../../interfaces/models/time-series.models";

describe("SynchronizationService", () => {
  function buildService(recentCandles: Partial<MarketCandleModel>[]) {
    const candleRepository = {
      findRangeCurrentValues: jest.fn().mockResolvedValue(recentCandles),
    } as unknown as MarketCandleRepository;
    const historicalImportService = {
      importHistoricalCandles: jest.fn().mockResolvedValue({ id: "job1" }),
    } as unknown as HistoricalImportService;
    return { service: new SynchronizationService(candleRepository, historicalImportService), historicalImportService };
  }

  it("reports already up to date when the latest candle is within one interval of now", async () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const { service, historicalImportService } = buildService([{ eventTime: new Date("2026-01-01T11:00:00Z") }]);

    const result = await service.synchronizeInstrument("inst1", "prov1", "ONE_HOUR", null, now);

    expect(result.synced).toBe(false);
    expect(historicalImportService.importHistoricalCandles).not.toHaveBeenCalled();
  });

  it("triggers an import to catch up when the latest candle is stale", async () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const { service, historicalImportService } = buildService([{ eventTime: new Date("2026-01-01T08:00:00Z") }]);

    const result = await service.synchronizeInstrument("inst1", "prov1", "ONE_HOUR", null, now);

    expect(result.synced).toBe(true);
    expect(historicalImportService.importHistoricalCandles).toHaveBeenCalledWith(
      expect.objectContaining({ instrumentId: "inst1", providerConfigId: "prov1", interval: "ONE_HOUR", to: now }),
      null,
    );
  });

  it("backfills a default window when there is no prior data at all", async () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const { service, historicalImportService } = buildService([]);

    const result = await service.synchronizeInstrument("inst1", "prov1", "ONE_DAY", null, now);

    expect(result.synced).toBe(true);
    expect(result.reason).toContain("no prior data");
    const callArg = (historicalImportService.importHistoricalCandles as jest.Mock).mock.calls[0][0];
    expect(callArg.from.getTime()).toBeLessThan(now.getTime());
  });

  it("passes the actorId through to the import call", async () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const { service, historicalImportService } = buildService([]);

    await service.synchronizeInstrument("inst1", "prov1", "ONE_DAY", "user1", now);

    expect(historicalImportService.importHistoricalCandles).toHaveBeenCalledWith(expect.anything(), "user1");
  });
});
