import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { SubscriptionPlan } from "@rmsm/database";
import { SubscriptionPlanRepository } from "./repositories/subscription-plan.repository";
import { Public } from "../auth/decorators/public.decorator";

/**
 * Public — a pricing page needs to be visible without authentication,
 * same reasoning as a marketing site. Every other billing endpoint
 * requires auth; this is the deliberate, single exception, matching the
 * kickoff prompt's plain "GET /billing/plans" (no auth qualifiers) rather
 * than grouping it under an authenticated section.
 */
@ApiTags("Billing Plans")
@Controller("billing/plans")
export class PlansController {
  constructor(private readonly planRepository: SubscriptionPlanRepository) {}

  @Public()
  @Get()
  @ApiOperation({ operationId: "listPlans", summary: "List publicly visible, active subscription plans." })
  list(): Promise<SubscriptionPlan[]> {
    return this.planRepository.findVisible();
  }
}
