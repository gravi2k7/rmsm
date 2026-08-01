const mockPrisma = {
  role: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  permission: { findMany: jest.fn() },
  userRole: { count: jest.fn() },
  rolePermission: { findMany: jest.fn() },
};

jest.mock("@rmsm/database", () => ({
  prisma: mockPrisma,
}));

import { RbacService } from "../rbac.service";
import { ConflictError, NotFoundError } from "@rmsm/shared";
import type { AuditService } from "../../auth/services/audit.service";
import type { PermissionResolverService } from "../services/permission-resolver.service";
import type { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import type { PermissionRepository } from "../repositories/permission.repository";

/**
 * Module 004 Domain 2 unit coverage — the new permission CRUD, role
 * dashboard, and permission matrix methods added to RbacService. The
 * pre-existing setParentRole/getRoleAncestors coverage lives in
 * rbac.service.hierarchy.spec.ts (updated for the new constructor
 * params, not duplicated here).
 */
function fakeAuditService(): jest.Mocked<Pick<AuditService, "log">> {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function fakeResolver(ancestorChain: string[] = []): jest.Mocked<Pick<PermissionResolverService, "getAncestorChain">> {
  return { getAncestorChain: jest.fn().mockResolvedValue(ancestorChain) };
}

function fakeEventPublisher(): jest.Mocked<Pick<DomainEventPublisher, "publish">> {
  return { publish: jest.fn() };
}

function fakePermissionRepository(): jest.Mocked<
  Pick<PermissionRepository, "findById" | "findByKey" | "create" | "update" | "delete" | "listCategories" | "countRolePermissions">
> {
  return {
    findById: jest.fn(),
    findByKey: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    listCategories: jest.fn(),
    countRolePermissions: jest.fn(),
  };
}

function buildService(overrides: {
  auditService?: ReturnType<typeof fakeAuditService>;
  resolver?: ReturnType<typeof fakeResolver>;
  eventPublisher?: ReturnType<typeof fakeEventPublisher>;
  permissionRepository?: ReturnType<typeof fakePermissionRepository>;
} = {}) {
  const auditService = overrides.auditService ?? fakeAuditService();
  const resolver = overrides.resolver ?? fakeResolver();
  const eventPublisher = overrides.eventPublisher ?? fakeEventPublisher();
  const permissionRepository = overrides.permissionRepository ?? fakePermissionRepository();
  const service = new RbacService(
    auditService as unknown as AuditService,
    resolver as unknown as PermissionResolverService,
    eventPublisher as unknown as DomainEventPublisher,
    permissionRepository as unknown as PermissionRepository,
  );
  return { service, auditService, resolver, eventPublisher, permissionRepository };
}

describe("RbacService — Module 004 permission CRUD", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createPermission", () => {
    it("creates a permission and logs an audit entry when the key is unused", async () => {
      const { service, permissionRepository, auditService } = buildService();
      permissionRepository.findByKey.mockResolvedValue(null);
      const created = { id: "perm-1", key: "reports.export", group: "reports", description: null };
      permissionRepository.create.mockResolvedValue(created as never);

      const result = await service.createPermission({ key: "reports.export", group: "reports" }, "admin-1");

      expect(permissionRepository.create).toHaveBeenCalledWith({ key: "reports.export", group: "reports" });
      expect(auditService.log).toHaveBeenCalledWith("permission.created", expect.objectContaining({ entityId: "perm-1" }));
      expect(result).toBe(created);
    });

    it("throws ConflictError when the permission key already exists", async () => {
      const { service, permissionRepository } = buildService();
      permissionRepository.findByKey.mockResolvedValue({ id: "existing", key: "reports.export" } as never);

      await expect(service.createPermission({ key: "reports.export", group: "reports" }, "admin-1")).rejects.toBeInstanceOf(
        ConflictError,
      );
    });
  });

  describe("updatePermission", () => {
    it("throws NotFoundError when the permission does not exist", async () => {
      const { service, permissionRepository } = buildService();
      permissionRepository.findById.mockResolvedValue(null);

      await expect(service.updatePermission("missing", { group: "x" }, "admin-1")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("updates and logs an audit entry when the permission exists", async () => {
      const { service, permissionRepository, auditService } = buildService();
      permissionRepository.findById.mockResolvedValue({ id: "perm-1", key: "reports.export" } as never);
      const updated = { id: "perm-1", key: "reports.export", group: "analytics" };
      permissionRepository.update.mockResolvedValue(updated as never);

      const result = await service.updatePermission("perm-1", { group: "analytics" }, "admin-1");

      expect(permissionRepository.update).toHaveBeenCalledWith("perm-1", { group: "analytics" });
      expect(auditService.log).toHaveBeenCalledWith("permission.updated", expect.objectContaining({ entityId: "perm-1" }));
      expect(result).toBe(updated);
    });
  });

  describe("deletePermission", () => {
    it("refuses to delete a permission still granted to at least one role", async () => {
      const { service, permissionRepository } = buildService();
      permissionRepository.findById.mockResolvedValue({ id: "perm-1", key: "reports.export" } as never);
      permissionRepository.countRolePermissions.mockResolvedValue(2);

      await expect(service.deletePermission("perm-1", "admin-1")).rejects.toBeInstanceOf(ConflictError);
      expect(permissionRepository.delete).not.toHaveBeenCalled();
    });

    it("deletes a permission with zero role grants and logs an audit entry", async () => {
      const { service, permissionRepository, auditService } = buildService();
      permissionRepository.findById.mockResolvedValue({ id: "perm-1", key: "reports.export" } as never);
      permissionRepository.countRolePermissions.mockResolvedValue(0);

      await service.deletePermission("perm-1", "admin-1");

      expect(permissionRepository.delete).toHaveBeenCalledWith("perm-1");
      expect(auditService.log).toHaveBeenCalledWith("permission.deleted", expect.objectContaining({ entityId: "perm-1" }));
    });

    it("throws NotFoundError when the permission does not exist", async () => {
      const { service, permissionRepository } = buildService();
      permissionRepository.findById.mockResolvedValue(null);

      await expect(service.deletePermission("missing", "admin-1")).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("getRole / updateRole", () => {
    it("throws NotFoundError when the role does not exist", async () => {
      const { service } = buildService();
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.getRole("missing")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("updates a role's description and publishes RoleUpdated", async () => {
      const { service, eventPublisher, auditService } = buildService();
      mockPrisma.role.findUnique.mockResolvedValue({ id: "role-1", name: "Custom" });
      mockPrisma.role.update.mockResolvedValue({ id: "role-1", name: "Custom", description: "New desc" });

      const result = await service.updateRole("role-1", "New desc", "admin-1");

      expect(mockPrisma.role.update).toHaveBeenCalledWith({ where: { id: "role-1" }, data: { description: "New desc" } });
      expect(eventPublisher.publish).toHaveBeenCalledWith("RoleUpdated", expect.objectContaining({ roleId: "role-1" }));
      expect(auditService.log).toHaveBeenCalledWith("role.updated", expect.objectContaining({ entityId: "role-1" }));
      expect(result).toEqual({ id: "role-1", name: "Custom", description: "New desc" });
    });
  });

  describe("getRoleDashboard", () => {
    it("composes role details, direct/effective permission counts, and assigned-user count", async () => {
      const { service, resolver } = buildService({ resolver: fakeResolver(["parent-role"]) });
      mockPrisma.role.findUnique.mockResolvedValue({
        id: "role-1",
        name: "Analyst",
        isSystem: false,
        parentRoleId: "parent-role",
        rolePermissions: [{ permission: { key: "reports.read" } }],
      });
      mockPrisma.userRole.count.mockResolvedValue(7);
      mockPrisma.rolePermission.findMany.mockResolvedValue([
        { permission: { key: "reports.read" } },
        { permission: { key: "reports.export" } },
      ]);

      const dashboard = await service.getRoleDashboard("role-1");

      expect(dashboard).toEqual({
        roleId: "role-1",
        name: "Analyst",
        isSystem: false,
        directPermissionCount: 1,
        effectivePermissionCount: 2,
        assignedUserCount: 7,
        parentRoleId: "parent-role",
      });
      expect(resolver.getAncestorChain).toHaveBeenCalledWith("role-1");
    });
  });

  describe("getPermissionMatrix", () => {
    it("cross-tabs every role against every permission, marking granted pairs", async () => {
      const { service } = buildService();
      mockPrisma.role.findMany.mockResolvedValue([
        { id: "role-1", name: "Admin", rolePermissions: [{ permission: { key: "users.read" } }] },
        { id: "role-2", name: "Viewer", rolePermissions: [] },
      ]);
      mockPrisma.permission.findMany.mockResolvedValue([
        { id: "p1", key: "users.read", group: "users" },
        { id: "p2", key: "users.write", group: "users" },
      ]);

      const matrix = await service.getPermissionMatrix();

      expect(matrix).toEqual([
        { roleId: "role-1", roleName: "Admin", permissionKey: "users.read", granted: true },
        { roleId: "role-1", roleName: "Admin", permissionKey: "users.write", granted: false },
        { roleId: "role-2", roleName: "Viewer", permissionKey: "users.read", granted: false },
        { roleId: "role-2", roleName: "Viewer", permissionKey: "users.write", granted: false },
      ]);
    });
  });

  describe("listPermissionCategories", () => {
    it("delegates to PermissionRepository.listCategories", async () => {
      const { service, permissionRepository } = buildService();
      permissionRepository.listCategories.mockResolvedValue(["users", "roles", "sessions"]);

      const categories = await service.listPermissionCategories();

      expect(categories).toEqual(["users", "roles", "sessions"]);
    });
  });
});
