/** The "role-based access" capability's unit of record: a named
 * bundle of permission strings. `RoleService.listPermissions(actorId)`
 * unions every role assigned to an actor into one flat permission set
 * — the exact shape `@rmsm/ai-tools`' `ToolInvocation.grantedPermissions`
 * already expects, so resolving it here and handing it to AI-402's own
 * (unmodified) `StaticPermissionChecker` is how the two packages
 * integrate. */
export interface Role {
  readonly name: string;
  readonly permissions: readonly string[];
}
