import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError } from "@rmsm/shared";
import { REQUIRE_FEATURE_KEY } from "../decorators/require-feature.decorator";
import { FeatureService } from "../services/feature.service";

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureService: FeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!featureKey) return true;

    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.organizationId;
    if (!organizationId) {
      throw new ForbiddenError("Feature check requires an organization context.");
    }

    await this.featureService.assertFeatureEnabled(organizationId, featureKey);
    return true;
  }
}
