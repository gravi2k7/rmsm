import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError } from "@rmsm/shared";
import { REQUIRE_QUOTA_KEY, QuotaRequirement } from "../decorators/require-quota.decorator";
import { QuotaService } from "../services/quota.service";

@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly quotaService: QuotaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<QuotaRequirement>(REQUIRE_QUOTA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requirement) return true;

    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError("Quota check requires an organization context.");
    }

    // assertWithinQuota throws ConflictError (409) on its own if exceeded;
    // re-thrown as ForbiddenError here would be wrong — a quota problem is
    // "valid request, can't be fulfilled right now" (409), not "you're not
    // allowed" (403). Let it propagate unchanged.
    await this.quotaService.assertWithinQuota(organizationId, requirement.featureKey, requirement.amount);
    return true;
  }
}
