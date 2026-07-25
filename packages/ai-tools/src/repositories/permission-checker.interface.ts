/** The "Permission checks" capability's abstraction —
 * `StaticPermissionChecker` (a real, deterministic set-membership
 * check against `ToolInvocation.grantedPermissions`) is the only
 * concrete implementation this package ships; a real RBAC-service-backed
 * checker (e.g. consulting `packages/database`'s RBAC tables) is a
 * future adapter of this interface. */
export interface PermissionChecker {
  /** Returns the subset of `requiredPermissions` NOT present in
   * `grantedPermissions` — empty means the check passed. */
  checkMissingPermissions(requiredPermissions: readonly string[], grantedPermissions: readonly string[]): readonly string[];
}
