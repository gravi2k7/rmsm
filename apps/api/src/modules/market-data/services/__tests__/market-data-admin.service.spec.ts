import { MarketDataAdminService } from "../market-data-admin.service";
import { NotFoundError } from "@rmsm/shared";
import type { MarketDataProviderConfigRepository } from "../../repositories/market-data-provider-config.repository";
import type { DataImportJobRepository } from "../../repositories/data-import-job.repository";
import type { MarketDataMetricsService } from "../market-data-metrics.service";

describe("MarketDataAdminService", () => {
  function buildService(overrides: { failedJobCount?: number } = {}) {
    const providerConfigRepository = { listActive: jest.fn(), findById: jest.fn() } as unknown as MarketDataProviderConfigRepository;
    const failedJobs = Array.from({ length: overrides.failedJobCount ?? 0 }, (_, i) => ({ id: `job${i}` }));
    const importJobRepository = {
      findById: jest.fn(),
      findByStatus: jest.fn().mockResolvedValue(failedJobs),
    } as unknown as DataImportJobRepository;
    const metrics = { snapshot: jest.fn().mockReturnValue({ "provider.POLYGON.call_failed": 3 }) } as unknown as MarketDataMetricsService;
    return new MarketDataAdminService(providerConfigRepository, importJobRepository, metrics);
  }

  it("reports ok status when failed import count is at or below the threshold", async () => {
    const service = buildService({ failedJobCount: 20 });
    const health = await service.getSynchronizationHealth();
    expect(health.status).toBe("ok");
    expect(health.totalFailedImportCount).toBe(20);
  });

  it("reports degraded status when failed import count exceeds the threshold", async () => {
    const service = buildService({ failedJobCount: 21 });
    const health = await service.getSynchronizationHealth();
    expect(health.status).toBe("degraded");
  });

  it("getProviderConfig throws NotFoundError for a missing config", async () => {
    const service = buildService();
    await expect(service.getProviderConfig("missing")).rejects.toThrow(NotFoundError);
  });

  it("getImportJob throws NotFoundError for a missing job", async () => {
    const service = buildService();
    await expect(service.getImportJob("missing")).rejects.toThrow(NotFoundError);
  });

  it("getMetrics returns the metrics service's snapshot", () => {
    const service = buildService();
    expect(service.getMetrics()).toEqual({ "provider.POLYGON.call_failed": 3 });
  });
});
