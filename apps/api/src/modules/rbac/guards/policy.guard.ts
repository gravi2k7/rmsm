import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { POLICY_KEY } from "../decorators/use-policy.decorator";
import type { Policy } from "../interfaces/policy.interface";
import type { AccessTokenPayload } from "../../auth/services/token.service";

/**
 * Evaluates the `Policy` attached via `@UsePolicy()`, if any. No policy
 * attached means this guard allows the request through — the same
 * "absence of metadata means unrestricted at this layer" convention
 * `PermissionsGuard`/`RolesGuard` already use. This guard adds an
 * attribute-based check on top of whatever those already enforce; it
 * doesn't replace needing them for the coarse-grained permission check.
 */
@Injectable()
export class PolicyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<Policy | undefined>(POLICY_KEY, [context.getHandler(), context.getClass()]);
    if (!policy) return true;

    const request = context.switchToHttp().getRequest();
    const user: AccessTokenPayload | undefined = request.user;
    if (!user) return false;

    return policy.evaluate({ user, routeParams: request.params ?? {} });
  }
}
