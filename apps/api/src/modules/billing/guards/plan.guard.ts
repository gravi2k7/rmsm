import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError } from "@rmsm/shared";
import { REQUIRE_PLAN_KEY } from "../decorators/require-plan.decorator";
import { SubscriptionService } from "../services/subscription.service";

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedPlanKeys = this.reflector.getAllAndOverride<string[]>(REQUIRE_PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowedPlanKeys || allowedPlanKeys.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError("Plan check requires an organization context.");
    }

    const subscription = await this.subscriptionService.getSubscription(organizationId);
    if (!allowedPlanKeys.includes(subscription.plan.key)) {
      throw new ForbiddenError(
        `This action requires one of the following plans: ${allowedPlanKeys.join(", ")}.`,
      );
    }
    return true;
  }
}
