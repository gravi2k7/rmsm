import { Injectable } from "@nestjs/common";
import { ForbiddenError, NotFoundError } from "@rmsm/shared";
import { OrganizationSubscriptionRepository } from "../repositories/organization-subscription.repository";
import { PlanFeatureRepository } from "../repositories/plan-feature.repository";

export interface FeatureAccess {
  enabled: boolean;
  /** Null means unlimited (only meaningful for LIMIT-type features). */
  limit: number | null;
}

/**
 * Answers "does this organization's current plan grant feature X, and
 * with what limit" — the read side QuotaService and the Phase 4
 * `RequireFeature`/`RequireQuota` guards both depend on. Does not touch
 * usage data itself (that's UsageService/QuotaService) — this is purely
 * about what the *plan* grants, not what's been *consumed*.
 */
@Injectable()
export class FeatureService {
  constructor(
    private readonly subscriptionRepository: OrganizationSubscriptionRepository,
    private readonly planFeatureRepository: PlanFeatureRepository,
  ) {}

  async getFeatureAccess(organizationId: string, featureKey: string): Promise<FeatureAccess> {
    const subscription = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (!subscription) {
      throw new NotFoundError("OrganizationSubscription", organizationId);
    }

    const planFeature = await this.planFeatureRepository.findByPlanAndFeatureKey(subscription.planId, featureKey);
    if (!planFeature) {
      // Feature not configured for this plan at all — treated as disabled,
      // not an error. A plan simply not mentioning a feature is the normal
      // case for most plan/feature combinations.
      return { enabled: false, limit: null };
    }

    return { enabled: planFeature.enabled, limit: planFeature.limit };
  }

  async hasFeature(organizationId: string, featureKey: string): Promise<boolean> {
    const access = await this.getFeatureAccess(organizationId, featureKey);
    return access.enabled;
  }

  /** Throws rather than returning a boolean — for guards (Phase 4) that need to short-circuit a request. */
  async assertFeatureEnabled(organizationId: string, featureKey: string): Promise<void> {
    const access = await this.getFeatureAccess(organizationId, featureKey);
    if (!access.enabled) {
      throw new ForbiddenError(`Feature "${featureKey}" is not available on this organization's current plan.`);
    }
  }
}
