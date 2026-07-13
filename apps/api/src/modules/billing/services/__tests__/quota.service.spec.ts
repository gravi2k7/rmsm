import { QuotaService } from "../quota.service";
import type { FeatureService, FeatureAccess } from "../feature.service";
import type { UsageService } from "../usage.service";

describe("QuotaService", () => {
  type FeatureServiceMock = jest.Mocked<Pick<FeatureService, "getFeatureAccess">>;
  type UsageServiceMock = jest.Mocked<Pick<UsageService, "getCurrentUsageForMetric">>;

  function buildService(access: FeatureAccess, used: bigint) {
    const featureService: FeatureServiceMock = { getFeatureAccess: jest.fn().mockResolvedValue(access) };
    const usageService: UsageServiceMock = { getCurrentUsageForMetric: jest.fn().mockResolvedValue(used) };
    const service = new QuotaService(
      featureService as unknown as FeatureService,
      usageService as unknown as UsageService,
    );
    return { service, featureService, usageService };
  }

  it("disallows when the feature isn't enabled at all", async () => {
    const { service } = buildService({ enabled: false, limit: null }, 0n);
    const result = await service.checkQuota("org1", "ai_requests");
    expect(result.allowed).toBe(false);
  });

  it("allows unlimited access without checking usage when limit is null", async () => {
    const { service, usageService } = buildService({ enabled: true, limit: null }, 0n);
    const result = await service.checkQuota("org1", "ai_requests");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeNull();
    expect(usageService.getCurrentUsageForMetric).not.toHaveBeenCalled();
  });

  it("allows when usage is below the limit", async () => {
    const { service } = buildService({ enabled: true, limit: 100 }, 40n);
    const result = await service.checkQuota("org1", "ai_requests");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(60);
  });

  it("disallows when usage has reached the limit", async () => {
    const { service } = buildService({ enabled: true, limit: 100 }, 100n);
    const result = await service.checkQuota("org1", "ai_requests");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("disallows a requested amount that would exceed the remaining quota", async () => {
    const { service } = buildService({ enabled: true, limit: 100 }, 95n);
    const result = await service.checkQuota("org1", "ai_requests", 10n);
    expect(result.allowed).toBe(false);
  });

  it("assertWithinQuota throws when the quota is exceeded", async () => {
    const { service } = buildService({ enabled: true, limit: 10 }, 10n);
    await expect(service.assertWithinQuota("org1", "ai_requests")).rejects.toThrow();
  });

  it("assertWithinQuota resolves without throwing when within quota", async () => {
    const { service } = buildService({ enabled: true, limit: 10 }, 5n);
    await expect(service.assertWithinQuota("org1", "ai_requests")).resolves.toBeUndefined();
  });
});
