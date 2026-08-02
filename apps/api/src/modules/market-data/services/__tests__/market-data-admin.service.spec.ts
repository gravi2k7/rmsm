jest.mock("@rmsm/database", () => ({
  prisma: { $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) },
}));

import { MarketDataAdminService } from "../market-data-admin.service";
import { NotFoundError } from "@rmsm/shared";
import type { MarketDataProviderConfigRepository } from "../../repositories/market-data-provider-config.repository";
import type { DataImportJobRepository } from "../../repositories/data-import-job.repository";
import type { MarketDataMetricsService } from "../market-data-metrics.service";
import type { ProviderRegistryService } from "../../providers/provider-registry.service";
import type { ProviderOrchestrationService } from "../provider-orchestration.service";
import type { ProviderConnectionTestService } from "../provider-connection-test.service";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { prisma } = require("@rmsm/database") as { prisma: { $queryRaw: jest.Mock } };

describe("MarketDataAdminService", () => {
  beforeEach(() => {
    prisma.$queryRaw.mockReset().mockResolvedValue([{ "?column?": 1 }]);
  });

  function buildService(
    overrides: { failedJobCount?: number; enabledProviders?: string[]; circuitStates?: Record<string, "closed" | "open" | "half_open">; dbThrows?: boolean } = {},
  ) {
    const providerConfigRepository = { listActive: jest.fn(), findById: jest.fn() } as unknown as MarketDataProviderConfigRepository;
    const failedJobs = Array.from({ length: overrides.failedJobCount ?? 0 }, (_, i) => ({ id: `job${i}` }));
    const importJobRepository = {
      findById: jest.fn(),
      findByStatus: jest.fn().mockResolvedValue(failedJobs),
    } as unknown as DataImportJobRepository;
    const metrics = { snapshot: jest.fn().mockReturnValue({ "provider.POLYGON.call_failed": 3 }) } as unknown as MarketDataMetricsService;
    const providerRegistry = {
      listEnabled: jest.fn().mockReturnValue(overrides.enabledProviders ?? []),
    } as unknown as ProviderRegistryService;
    const providerOrchestration = {
      getCircuitState: jest.fn((type: string) => overrides.circuitStates?.[type] ?? "closed"),
    } as unknown as ProviderOrchestrationService;
    const providerConnectionTestService = {
     testConnection: jest.fn(),
    } as unknown as ProviderConnectionTestService;

  return new MarketDataAdminService(
  providerConfigRepository,
  importJobRepository,
  metrics,
  providerRegistry,
  providerOrchestration,
  providerConnectionTestService,
   );
  }
  it("reports ok status when failed import count is at or below the threshold and no circuits are open", async () => {
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

  it("reports degraded status when any provider's circuit is open, regardless of import count", async () => {
    const service = buildService({ failedJobCount: 0, enabledProviders: ["POLYGON"], circuitStates: { POLYGON: "open" } });
    const health = await service.getSynchronizationHealth();
    expect(health.status).toBe("degraded");
    expect(health.providers).toEqual([{ type: "POLYGON", enabled: true, circuitState: "open" }]);
  });

  it("reports each enabled provider's circuit state", async () => {
    const service = buildService({ enabledProviders: ["POLYGON", "BINANCE"], circuitStates: { POLYGON: "closed", BINANCE: "half_open" } });
    const health = await service.getSynchronizationHealth();
    expect(health.providers).toHaveLength(2);
    expect(health.providers.find((p) => p.type === "BINANCE")?.circuitState).toBe("half_open");
  });

  it("reports database: ok when the connectivity check succeeds", async () => {
    const service = buildService();
    const health = await service.getSynchronizationHealth();
    expect(health.database).toBe("ok");
  });

  it("reports database: error and degraded status when the connectivity check throws", async () => {
    prisma.$queryRaw.mockRejectedValue(new Error("connection refused"));
    const service = buildService();
    const health = await service.getSynchronizationHealth();
    expect(health.database).toBe("error");
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
