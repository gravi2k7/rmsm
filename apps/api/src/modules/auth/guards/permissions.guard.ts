import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import type { AccessTokenPayload } from "../services/token.service";

/** Unlike RolesGuard (any-of), this requires ALL listed permissions — the stricter default for permission checks. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user: AccessTokenPayload = context.switchToHttp().getRequest().user;
    if (!user) return false;
    return required.every((perm) => user.permissions.includes(perm));
  }
}
