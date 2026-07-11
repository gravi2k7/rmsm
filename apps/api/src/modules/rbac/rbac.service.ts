import { Injectable } from "@nestjs/common";
import { prisma, Role, Permission, RolePermission, UserRole, RoleWithPermissions } from "@rmsm/database";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { AuditService } from "../auth/services/audit.service";

@Injectable()
export class RbacService {
  constructor(private readonly auditService: AuditService) {}

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
}