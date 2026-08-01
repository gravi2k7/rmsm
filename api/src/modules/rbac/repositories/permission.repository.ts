import { Injectable } from "@nestjs/common";
import { prisma, Permission } from "@rmsm/database";

export interface CreatePermissionInput {
  key: string;
  description?: string;
  group: string;
}

export interface UpdatePermissionInput {
  description?: string;
  group?: string;
}

/**
 * Repository Pattern for `Permission` — didn't exist before Module 004
 * (the pre-existing `RbacService` reads permissions via `prisma.permission`
 * directly for its one existing `listPermissions()` method; that method
 * is left unchanged). Every NEW permission-mutation method Module 004
 * adds goes through this repository instead of adding more direct-`prisma`
 * call sites, consistent with this milestone's "no Prisma outside
 * repositories" rule for new code.
 */
@Injectable()
export class PermissionRepository {
  findById(id: string): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { id } });
  }

  findByKey(key: string): Promise<Permission | null> {
    return prisma.permission.findUnique({ where: { key } });
  }

  create(data: CreatePermissionInput): Promise<Permission> {
    return prisma.permission.create({ data });
  }

  update(id: string, data: UpdatePermissionInput): Promise<Permission> {
    return prisma.permission.update({ where: { id }, data });
  }

  delete(id: string): Promise<Permission> {
    return prisma.permission.delete({ where: { id } });
  }

  /** Distinct `group` values, backing `GET /permission-categories` — `Permission.group` IS the category, per that column's own schema comment. */
  async listCategories(): Promise<string[]> {
    const rows = await prisma.permission.findMany({ distinct: ["group"], select: { group: true }, orderBy: { group: "asc" } });
    return rows.map((r: { group: string }) => r.group);
  }

  countRolePermissions(permissionId: string): Promise<number> {
    return prisma.rolePermission.count({ where: { permissionId } });
  }
}
