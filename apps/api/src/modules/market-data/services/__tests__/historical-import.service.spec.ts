jest.mock("@rmsm/database", () => ({
  prisma: {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));

import { HistoricalImportService } from "../historical-import.service";
import type { InstrumentRepository } from "../../repositories/instrument.repository";
import type { InstrumentAliasRepository } from "../../repositories/instrument-alias.repository";
import type { MarketDataProviderConfigRepository } from "../../repositories/market-data-provider-config.repository";
import type { MarketCandleRepository } from "../../repositories/market-candle.repository";
import type { DataImportJobRepository } from "../../repositories/data-import-job.repository";
import type { DataQualityIssueRepository } from "../../repositories/data-quality-issue.repository";
import type { ProviderOrchestrationService } from "../provider-orchestration.service";
import type { MarketDataMetricsService } from "../market-data-metrics.service";
import type { AuditService } from "../../../auth/services/audit.service";
import { NotFoundError } from "@rmsm/shared";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("@rmsm/database") as { prisma: { $transaction: jest.Mock } };

describe("HistoricalImportService", () => {
  const instrument = { id: "inst1" };
  const providerConfig = { id: "prov1", type: "POLYGON" };
  const alias = { instrumentId: "inst1", providerId: "prov1", providerSymbol: "AAPL" };
  const job = { id: "job1", status: "PENDING" };

  function buildDeps() {
    const instrumentRepository = { findById: jest.fn().mockResolvedValue(instrument) } as unknown as InstrumentRepository;
    const instrumentAliasRepository = { findByInstrument: jest.fn().mockResolvedValue([alias]) } as unknown as InstrumentAliasRepository;
    const providerConfigRepository = { findById: jest.fn().mockResolvedValue(providerConfig) } as unknown as MarketDataProviderConfigRepository;
    const candleRepository = { upsert: jest.fn().mockResolvedValue({}) } as unknown as MarketCandleRepository;
    const importJobRepository = {
      create: jest.fn().mockResolvedValue(job),
      markRunning: jest.fn().mockResolvedValue(job),
      markCompleted: jest.fn().mockResolvedValue({ ...job, status: "COMPLETED" }),
      markFailed: jest.fn().mockResolvedValue({ ...job, status: "FAILED" }),
      findById: jest.fn().mockResolvedValue({ ...job, status: "COMPLETED" }),
    } as unknown as DataImportJobRepository;
    const dataQualityIssueRepository = { create: jest.fn().mockResolvedValue({}) } as unknown as DataQualityIssueRepository;
    const orchestration = { executeWithRetry: jest.fn() } as unknown as ProviderOrchestrationService;
    const metrics = { increment: jest.fn(), snapshot: jest.fn() } as unknown as MarketDataMetricsService;
    const auditService = { log: jest.fn().mockResolvedValue({}) } as unknown as AuditService;

    const service = new HistoricalImportService(
      instrumentRepository,
      instrumentAliasRepository,
      providerConfigRepository,
      candleRepository,
      importJobRepository,
      dataQualityIssueRepository,
      orchestration,
      metrics,
      auditService,
    );

    return { service, instrumentRepository, providerConfigRepository, instrumentAliasRepository, candleRepository, importJobRepository, dataQualityIssueRepository, orchestration, metrics, auditService };
  }

  const request = { instrumentId: "inst1", providerConfigId: "prov1", interval: "ONE_DAY" as const, from: new Date("2026-01-01"), to: new Date("2026-01-02") };

  it("throws NotFoundError when the instrument doesn't exist", async () => {
    const deps = buildDeps();
    (deps.instrumentRepository.findById as jest.Mock).mockResolvedValue(null);
    await expect(deps.service.importHistoricalCandles(request, null)).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when no InstrumentAlias exists for this provider", async () => {
    const deps = buildDeps();
    (deps.instrumentAliasRepository.findByInstrument as jest.Mock).mockResolvedValue([]);
    await expect(deps.service.importHistoricalCandles(request, null)).rejects.toThrow(NotFoundError);
  });

  it("persists valid candles and marks the job completed", async () => {
    const deps = buildDeps();
    (deps.orchestration.executeWithRetry as jest.Mock).mockResolvedValue({
      candles: [
        { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-01"), open: "100", high: "105", low: "99", close: "102", volume: "1000" },
      ],
    });

    const result = await deps.service.importHistoricalCandles(request, "user1");

    expect(deps.candleRepository.upsert).toHaveBeenCalledTimes(1);
    expect(deps.importJobRepository.markCompleted).toHaveBeenCalledWith("job1", 1, 0, expect.anything());
    expect(deps.auditService.log).toHaveBeenCalledWith("market_data.historical_import.completed", expect.objectContaining({ userId: "user1" }));
    expect(deps.metrics.increment).toHaveBeenCalledWith("import.POLYGON.candles_persisted", 1);
    expect(result.status).toBe("COMPLETED");
  });

  it("rejects an invalid candle (fails OHLC validation) as a DataQualityIssue, not a persisted row", async () => {
    const deps = buildDeps();
    (deps.orchestration.executeWithRetry as jest.Mock).mockResolvedValue({
      candles: [
        { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-01"), open: "100", high: "50", low: "99", close: "102", volume: "1000" }, // high < open, invalid
      ],
    });

    await deps.service.importHistoricalCandles(request, null);

    expect(deps.candleRepository.upsert).not.toHaveBeenCalled();
    expect(deps.dataQualityIssueRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ issueType: "invalid_candle", importJobId: "job1" }),
    );
    expect(deps.importJobRepository.markCompleted).toHaveBeenCalledWith("job1", 0, 1, expect.anything());
  });

  it("deduplicates within the batch before persisting", async () => {
    const deps = buildDeps();
    const candle = { providerSymbol: "AAPL", interval: "ONE_DAY", eventTime: new Date("2026-01-01"), open: "100", high: "105", low: "99", close: "102", volume: "1000" };
    (deps.orchestration.executeWithRetry as jest.Mock).mockResolvedValue({ candles: [candle, { ...candle }] });

    await deps.service.importHistoricalCandles(request, null);

    expect(deps.candleRepository.upsert).toHaveBeenCalledTimes(1);
    expect(deps.importJobRepository.markCompleted).toHaveBeenCalledWith("job1", 1, 1, expect.anything());
  });

  it("marks the job failed and audits when the provider call throws", async () => {
    const deps = buildDeps();
    (deps.orchestration.executeWithRetry as jest.Mock).mockRejectedValue(new Error("provider down"));

    await expect(deps.service.importHistoricalCandles(request, "user1")).rejects.toThrow("provider down");

    expect(deps.importJobRepository.markFailed).toHaveBeenCalledWith("job1", "provider down");
    expect(deps.auditService.log).toHaveBeenCalledWith("market_data.historical_import.failed", expect.objectContaining({ userId: "user1" }));
    expect(deps.metrics.increment).toHaveBeenCalledWith("import.POLYGON.failed");
  });

  it("uses the real prisma.$transaction wrapper for the persist step", async () => {
    const deps = buildDeps();
    (deps.orchestration.executeWithRetry as jest.Mock).mockResolvedValue({ candles: [] });

    await deps.service.importHistoricalCandles(request, null);

    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
