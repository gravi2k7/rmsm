import { Injectable } from "@nestjs/common";
import { prisma, Role, Permission, RolePermission, UserRole, RoleWithPermissions } from "@rmsm/database";
import { NotFoundError, ValidationError, ConflictError } from "@rmsm/shared";
import { AuditService } from "../auth/services/audit.service";
import { PermissionResolverService } from "./services/permission-resolver.service";
import { DomainEventPublisher } from "../../common/events/domain-event-publisher.service";
import { PermissionRepository, CreatePermissionInput, UpdatePermissionInput } from "./repositories/permission.repository";
import { RBAC_EVENTS } from "./events";

export interface RoleDashboard {
  roleId: string;
  name: string;
  isSystem: boolean;
  directPermissionCount: number;
  effectivePermissionCount: number;
  assignedUserCount: number;
  parentRoleId: string | null;
}

export interface PermissionMatrixEntry {
  roleId: string;
  roleName: string;
  permissionKey: string;
  granted: boolean;
}

@Injectable()
export class RbacService {
  constructor(
  private readonly auditService: AuditService,
  private readonly permissionResolver: PermissionResolverService,
  private readonly eventPublisher: DomainEventPublisher,
  private readonly permissionRepository: PermissionRepository,
) {}

  listRoles(): Promise<RoleWithPermissions[]> {
    return prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
      orderBy: { name: "asc" },
    });
  }

  listPermissions(): Promise<Permission[]> {
    return prisma.permission.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  }

  async createRole(name: string, description: string | undefined, actorUserId: string): Promise<Role> {
    const existing = await prisma.role.findUnique({ where: { name } });
    if (existing) throw new ValidationError(`Role "${name}" already exists.`);

    const role = await prisma.role.create({ data: { name, description, isSystem: false } });
    await this.auditService.log("role.created", {
      userId: actorUserId,
      entityType: "Role",
      entityId: role.id,
      metadata: { name },
    });
    this.eventPublisher.publish(RBAC_EVENTS.ROLE_CREATED, { roleId: role.id, actorId: actorUserId, name });
    return role;
  }

  async deleteRole(roleId: string, actorUserId: string): Promise<void> {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundError("Role", roleId);
    if (role.isSystem) throw new ValidationError("System roles cannot be deleted.");

    await prisma.role.delete({ where: { id: roleId } });
    await this.auditService.log("role.deleted", {
      userId: actorUserId,
      entityType: "Role",
      entityId: roleId,
      metadata: { name: role.name },
    });
  }

  async assignRole(userId: string, roleId: string, actorUserId: string): Promise<UserRole> {
    const [user, role] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.role.findUnique({ where: { id: roleId } }),
    ]);
    if (!user) throw new NotFoundError("User", userId);
    if (!role) throw new NotFoundError("Role", roleId);

    // Not an `upsert` on the userId_roleId_tenantId compound unique key:
    // tenantId is nullable, and SQL treats NULL as never equal to NULL for
    // uniqueness purposes, so Prisma 5.22's generated compound-key input
    // for that constraint doesn't accept an explicit `null` the way
    // `upsert`'s `where` needs — it fails to compile. findFirst + create
    // is the correct equivalent: same idempotent "assign if not already
    // assigned" behavior, without relying on that unique-key path.
    const existing = await prisma.userRole.findFirst({
      where: { userId, roleId, tenantId: null },
    });
    const assignment = existing ?? (await prisma.userRole.create({ data: { userId, roleId } }));

    await this.auditService.log("role.assigned", {
      userId: actorUserId,
      entityType: "User",
      entityId: userId,
      metadata: { roleId, roleName: role.name },
    });
    this.eventPublisher.publish(RBAC_EVENTS.ROLE_ASSIGNED, { userId, roleId, actorId: actorUserId });
    return assignment;
  }

  async revokeRole(userId: string, roleId: string, actorUserId: string): Promise<void> {
    await prisma.userRole.deleteMany({ where: { userId, roleId, tenantId: null } });
    await this.auditService.log("role.revoked", {
      userId: actorUserId,
      entityType: "User",
      entityId: userId,
      metadata: { roleId },
    });
  }

  async grantPermission(roleId: string, permissionId: string, actorUserId: string): Promise<RolePermission> {
    const grant = await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId } },
      update: {},
      create: { roleId, permissionId },
    });
    await this.auditService.log("permission.granted", {
      userId: actorUserId,
      entityType: "Role",
      entityId: roleId,
      metadata: { permissionId },
    });
    this.eventPublisher.publish(RBAC_EVENTS.PERMISSION_ASSIGNED, { roleId, permissionId, actorId: actorUserId });
    return grant;
  }

  async revokePermission(roleId: string, permissionId: string, actorUserId: string): Promise<void> {
    await prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
    await this.auditService.log("permission.revoked", {
      userId: actorUserId,
      entityType: "Role",
      entityId: roleId,
      metadata: { permissionId },
    });
  }
  async setParentRole(
  roleId: string,
  parentRoleId: string | null,
  actorUserId: string,
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
   });

if (!role) {
  throw new NotFoundError("Role", roleId);
  }
  if (parentRoleId === roleId) {
  throw new ValidationError("A role cannot be its own parent.");
}
let parentRole: Role | null = null;

if (parentRoleId !== null) {
  parentRole = await prisma.role.findUnique({
    where: { id: parentRoleId },
  });

  if (!parentRole) {
    throw new NotFoundError("Role", parentRoleId);
  }
}
if (parentRoleId !== null) {
  const ancestors = await this.permissionResolver.getAncestorChain(parentRoleId);

  if (ancestors.includes(roleId)) {
    throw new ValidationError(
      "This parent assignment would create a circular role hierarchy.",
    );
  }
}
const updatedRole = await prisma.role.update({
  where: { id: roleId },
  data: { parentRoleId },
});await this.auditService.log("role.parent.updated", {
  userId: actorUserId,
  entityType: "Role",
  entityId: roleId,
  metadata: {
    previousParentRoleId: role.parentRoleId,
    newParentRoleId: parentRoleId,
  },
});

return updatedRole;
}
  async getRoleAncestors(roleId: string): Promise<string[]> {
  return this.permissionResolver.getAncestorChain(roleId);
}

  // ── Module 004 additions (additive — every method above is unchanged) ──

  async getRole(roleId: string): Promise<RoleWithPermissions> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundError("Role", roleId);
    return role;
  }

  async updateRole(roleId: string, description: string | undefined, actorUserId: string): Promise<Role> {
    const existing = await prisma.role.findUnique({ where: { id: roleId } });
    if (!existing) throw new NotFoundError("Role", roleId);

    const updated = await prisma.role.update({ where: { id: roleId }, data: { description } });
    await this.auditService.log("role.updated", {
      userId: actorUserId,
      entityType: "Role",
      entityId: roleId,
      metadata: { fields: ["description"] },
    });
    this.eventPublisher.publish(RBAC_EVENTS.ROLE_UPDATED, { roleId, actorId: actorUserId });
    return updated;
  }

  async createPermission(input: CreatePermissionInput, actorUserId: string): Promise<Permission> {
    const existing = await this.permissionRepository.findByKey(input.key);
    if (existing) throw new ConflictError(`Permission "${input.key}" already exists.`);

    const permission = await this.permissionRepository.create(input);
    await this.auditService.log("permission.created", {
      userId: actorUserId,
      entityType: "Permission",
      entityId: permission.id,
      metadata: { key: input.key },
    });
    return permission;
  }

  async updatePermission(permissionId: string, input: UpdatePermissionInput, actorUserId: string): Promise<Permission> {
    const existing = await this.permissionRepository.findById(permissionId);
    if (!existing) throw new NotFoundError("Permission", permissionId);

    const updated = await this.permissionRepository.update(permissionId, input);
    await this.auditService.log("permission.updated", {
      userId: actorUserId,
      entityType: "Permission",
      entityId: permissionId,
      metadata: { fields: Object.keys(input) },
    });
    return updated;
  }

  /**
   * Refuses to delete a permission still granted to at least one role —
   * the same "don't silently orphan a reference" principle Module 003's
   * `OrganizationRepository` applies to organizations with active
   * members. An admin must revoke every grant first (`DELETE
   * /roles/:roleId/permissions/:permissionId`, pre-existing and
   * unchanged), which is also what correctly triggers the effective-
   * permission recalculation for every affected user.
   */
  async deletePermission(permissionId: string, actorUserId: string): Promise<void> {
    const existing = await this.permissionRepository.findById(permissionId);
    if (!existing) throw new NotFoundError("Permission", permissionId);

    const grantCount = await this.permissionRepository.countRolePermissions(permissionId);
    if (grantCount > 0) {
      throw new ConflictError(`Permission "${existing.key}" is still granted to ${grantCount} role(s). Revoke those grants first.`);
    }

    await this.permissionRepository.delete(permissionId);
    await this.auditService.log("permission.deleted", {
      userId: actorUserId,
      entityType: "Permission",
      entityId: permissionId,
      metadata: { key: existing.key },
    });
  }

  listPermissionCategories(): Promise<string[]> {
    return this.permissionRepository.listCategories();
  }

  /** Cross-tab of every role x every permission — `granted: true` where a `RolePermission` row exists for that pair. Backs the admin UI's Permission Matrix view. */
  async getPermissionMatrix(): Promise<PermissionMatrixEntry[]> {
    const [roles, permissions] = await Promise.all([this.listRoles(), this.listPermissions()]);
    const entries: PermissionMatrixEntry[] = [];
    for (const role of roles) {
      const grantedKeys = new Set(role.rolePermissions.map((rp) => rp.permission.key));
      for (const permission of permissions) {
        entries.push({
          roleId: role.id,
          roleName: role.name,
          permissionKey: permission.key,
          granted: grantedKeys.has(permission.key),
        });
      }
    }
    return entries;
  }

  async getRoleDashboard(roleId: string): Promise<RoleDashboard> {
    const role = await this.getRole(roleId);
    const [assignedUserCount, effectivePermissionKeys] = await Promise.all([
      prisma.userRole.count({ where: { roleId } }),
      this.getEffectivePermissionsForRole(roleId),
    ]);

    return {
      roleId: role.id,
      name: role.name,
      isSystem: role.isSystem,
      directPermissionCount: role.rolePermissions.length,
      effectivePermissionCount: effectivePermissionKeys.length,
      assignedUserCount,
      parentRoleId: role.parentRoleId,
    };
  }

  /** A role's own permissions plus every ancestor's, deduplicated — same walk `PermissionResolverService` does per-user, applied to a single role instead. */
  private async getEffectivePermissionsForRole(roleId: string): Promise<string[]> {
    const ancestorIds = await this.permissionResolver.getAncestorChain(roleId);
    const roleIds = [roleId, ...ancestorIds];
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId: { in: roleIds } },
      include: { permission: true },
    });
    return Array.from(new Set(rolePermissions.map((rp: { permission: { key: string } }) => rp.permission.key)));
  }
}
