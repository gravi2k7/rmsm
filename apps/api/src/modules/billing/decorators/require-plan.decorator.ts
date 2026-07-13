import { SetMetadata } from "@nestjs/common";

export const REQUIRE_PLAN_KEY = "requirePlan";

/** Gates an endpoint on the organization's current plan being one of the given plan keys (e.g. "professional", "enterprise"). */
export const RequirePlan = (...planKeys: string[]) => SetMetadata(REQUIRE_PLAN_KEY, planKeys);
