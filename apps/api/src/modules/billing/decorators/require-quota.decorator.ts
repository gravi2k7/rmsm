import { SetMetadata } from "@nestjs/common";

export interface QuotaRequirement {
  featureKey: string;
  amount: bigint;
}

export const REQUIRE_QUOTA_KEY = "requireQuota";

/** Gates an endpoint on the organization having remaining quota for this metric — checked by QuotaGuard via QuotaService, before the handler runs (not a substitute for calling UsageService.recordUsage() after success). */
export const RequireQuota = (featureKey: string, amount: bigint = 1n) =>
  SetMetadata(REQUIRE_QUOTA_KEY, { featureKey, amount } satisfies QuotaRequirement);
