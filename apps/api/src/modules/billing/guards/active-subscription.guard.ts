import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { ForbiddenError } from "@rmsm/shared";
import { SubscriptionService } from "../services/subscription.service";

/**
 * Requires the organization to have a subscription in ACTIVE or TRIALING
 * status — the baseline gate most billing-adjacent business features
 * (outside this module, in future modules) will apply. No metadata/
 * decorator needed since this check is unconditional wherever it's
 * applied — unlike FeatureGuard/PlanGuard/QuotaGuard, which need to know
 * *which* feature/plan/quota to check.
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.organizationId;
    if (!organizationId) return true; // nothing to check — route isn't organization-scoped

    const subscription = await this.subscriptionService.getSubscription(organizationId);
    if (subscription.status !== "ACTIVE" && subscription.status !== "TRIALING") {
      throw new ForbiddenError(`This organization's subscription is ${subscription.status}, not active.`);
    }
    return true;
  }
}
