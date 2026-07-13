import { Injectable } from "@nestjs/common";
import { ConflictError } from "@rmsm/shared";
import { FeatureService } from "./feature.service";
import { UsageService } from "./usage.service";

export interface QuotaCheckResult {
  allowed: boolean;
  limit: number | null;
  used: bigint;
  remaining: number | null;
}

/**
 * "Is this organization allowed to do this one more time" — combines
 * FeatureService (what the plan grants) with UsageService (what's already
 * been consumed this period). Depends on both services, not their
 * repositories directly, since it needs FeatureService's plan-lookup
 * logic and UsageService's period-key logic, not just raw rows.
 */
@Injectable()
export class QuotaService {
  constructor(
    private readonly featureService: FeatureService,
    private readonly usageService: UsageService,
  ) {}

  async checkQuota(organizationId: string, featureKey: string, requestedAmount = 1n): Promise<QuotaCheckResult> {
    const access = await this.featureService.getFeatureAccess(organizationId, featureKey);
    if (!access.enabled) {
      return { allowed: false, limit: access.limit, used: 0n, remaining: access.limit };
    }
    if (access.limit === null) {
      // Unlimited — no usage lookup needed.
      return { allowed: true, limit: null, used: 0n, remaining: null };
    }

    const used = await this.usageService.getCurrentUsageForMetric(organizationId, featureKey);
    const remaining = access.limit - Number(used);
    return {
      allowed: remaining >= Number(requestedAmount),
      limit: access.limit,
      used,
      remaining: Math.max(remaining, 0),
    };
  }

  /** For guards (Phase 4) and services that need to short-circuit rather than branch on a boolean. */
  async assertWithinQuota(organizationId: string, featureKey: string, requestedAmount = 1n): Promise<void> {
    const result = await this.checkQuota(organizationId, featureKey, requestedAmount);
    if (!result.allowed) {
      throw new ConflictError(
        result.limit === null
          ? `Feature "${featureKey}" is not enabled for this organization.`
          : `Quota exceeded for "${featureKey}": ${result.used}/${result.limit} used this period.`,
      );
    }
  }
}
