import type { PermissionChecker } from "../repositories/permission-checker.interface";

/** The real, default `PermissionChecker` — plain set-difference against
 * the caller-supplied `grantedPermissions`. No external auth/RBAC
 * service dependency; a real service-backed checker is a future
 * adapter of this interface. */
export class StaticPermissionChecker implements PermissionChecker {
  checkMissingPermissions(requiredPermissions: readonly string[], grantedPermissions: readonly string[]): readonly string[] {
    const granted = new Set(grantedPermissions);
    return requiredPermissions.filter((permission) => !granted.has(permission));
  }
}
