import { SetMetadata } from "@nestjs/common";

export const REQUIRE_FEATURE_KEY = "requireFeature";

/** Gates an endpoint on the organization's current plan having this feature enabled — checked by FeatureGuard via FeatureService. */
export const RequireFeature = (featureKey: string) => SetMetadata(REQUIRE_FEATURE_KEY, featureKey);
