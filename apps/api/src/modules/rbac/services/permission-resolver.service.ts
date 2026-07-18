import { Injectable } from "@nestjs/common";
import { prisma, type RoleWithPermissionsAndParent } from "@rmsm/database";

/**
 * Computes a user's *effective* permission set — every permission
 * directly granted to any of their roles, plus every permission granted
 * to each of those roles' ancestors (Epic 8's own role-hierarchy
 * addition). This is the one place that walk happens; nothing else in
 * the platform should re-derive it independently.
 *
 * Deliberately a separate service from `RbacService` (which owns role/
 * permission CRUD) — this service only *reads* and *computes*, matching
 * this epic's own "separate services from repositories" principle
 * extended to "separate the read-and-compute concern from the
 * mutate-and-audit concern" as well.
 */
@Injectable()
export class PermissionResolverService {
  /** Resolves the effective, deduplicated permission key set for a user,
   * across every role assigned to them and each role's own ancestor
   * chain. */
  async resolveForUser(userId: string): Promise<string[]> {
    const userRoles = await prisma.userRole.findMany({
      where: { userId },
      include: { role: { include: { rolePermissions: { include: { permission: true } }, parentRole: true } } },
    });

    const permissionKeys = new Set<string>();
    for (const userRole of userRoles) {
      await this.collectPermissions(userRole.role, permissionKeys, new Set());
    }
    return Array.from(permissionKeys);
  }

  /** Returns a role's own permission keys plus every ancestor's, walking
   * `parentRoleId` up the chain. `visitedRoleIds` guards against a cyclic
   * hierarchy (e.g. a data-integrity bug or a race during role editing)
   * turning into infinite recursion — a cycle simply stops resolving
   * further inheritance at the point it's detected, rather than hanging
   * the request. */
  private async collectPermissions(role: RoleWithPermissionsAndParent, into: Set<string>, visitedRoleIds: Set<string>): Promise<void> {
    if (visitedRoleIds.has(role.id)) return;
    visitedRoleIds.add(role.id);

    for (const rolePermission of role.rolePermissions) {
      into.add(rolePermission.permission.key);
    }

    if (!role.parentRoleId) return;

    const parent = await prisma.role.findUnique({
      where: { id: role.parentRoleId },
      include: { rolePermissions: { include: { permission: true } }, parentRole: true },
    });
    if (parent) await this.collectPermissions(parent, into, visitedRoleIds);
  }

  /** Returns the full ancestor chain for a role, nearest-first — used by
   * `RbacController`'s own hierarchy-inspection endpoint, and by
   * `RbacService.setParentRole()` to reject a change that would
   * introduce a cycle before it's ever persisted. */
  async getAncestorChain(roleId: string): Promise<string[]> {
    const chain: string[] = [];
    const visited = new Set<string>();
    let currentId: string | null = roleId;

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const role: { parentRoleId: string | null } | null = await prisma.role.findUnique({
        where: { id: currentId },
        select: { parentRoleId: true },
      });
      if (!role?.parentRoleId) break;
      chain.push(role.parentRoleId);
      currentId = role.parentRoleId;
    }

    return chain;
  }
}
