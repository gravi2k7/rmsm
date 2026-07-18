const mockPrisma = {
  role: { findUnique: jest.fn(), update: jest.fn() },
};

jest.mock("@rmsm/database", () => ({
  prisma: mockPrisma,
}));

import { RbacService } from "../rbac.service";
import { ValidationError, NotFoundError } from "@rmsm/shared";
import type { AuditService } from "../../auth/services/audit.service";
import type { PermissionResolverService } from "../services/permission-resolver.service";

function fakeAuditService(): AuditService {
  return { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
}

function fakeResolver(ancestorChain: string[] = []): PermissionResolverService {
  return {
    getAncestorChain: jest.fn().mockResolvedValue(ancestorChain),
    resolveForUser: jest.fn(),
  } as unknown as PermissionResolverService;
}

describe("RbacService.setParentRole", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects a role being set as its own parent", async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ id: "role-1", name: "Role One" });
    const service = new RbacService(fakeAuditService(), fakeResolver());

    await expect(service.setParentRole("role-1", "role-1", "actor-1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects a parent whose own ancestor chain already includes this role (would create a cycle)", async () => {
    mockPrisma.role.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "child") return Promise.resolve({ id: "child", name: "Child" });
      if (where.id === "grandchild") return Promise.resolve({ id: "grandchild", name: "Grandchild" });
      return Promise.resolve(null);
    });
    const resolver = fakeResolver(["grandchild", "child"]);
    const service = new RbacService(fakeAuditService(), resolver);

    await expect(service.setParentRole("child", "grandchild", "actor-1")).rejects.toBeInstanceOf(ValidationError);
  });

  it("throws NotFoundError when the role itself does not exist", async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    const service = new RbacService(fakeAuditService(), fakeResolver());

    await expect(service.setParentRole("missing", null, "actor-1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError when the target parent role does not exist", async () => {
    mockPrisma.role.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "role-1") return Promise.resolve({ id: "role-1", name: "Role One" });
      return Promise.resolve(null);
    });
    const service = new RbacService(fakeAuditService(), fakeResolver());

    await expect(service.setParentRole("role-1", "missing-parent", "actor-1")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("succeeds and persists a valid, non-cyclic parent assignment", async () => {
    mockPrisma.role.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "child") return Promise.resolve({ id: "child", name: "Child" });
      if (where.id === "parent") return Promise.resolve({ id: "parent", name: "Parent" });
      return Promise.resolve(null);
    });
    mockPrisma.role.update.mockResolvedValue({ id: "child", parentRoleId: "parent" });
    const resolver = fakeResolver([]);
    const service = new RbacService(fakeAuditService(), resolver);

    const result = await service.setParentRole("child", "parent", "actor-1");

    expect(result).toEqual({ id: "child", parentRoleId: "parent" });
    expect(mockPrisma.role.update).toHaveBeenCalledWith({ where: { id: "child" }, data: { parentRoleId: "parent" } });
  });

  it("allows clearing the parent (setting it to null)", async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ id: "role-1", name: "Role One" });
    mockPrisma.role.update.mockResolvedValue({ id: "role-1", parentRoleId: null });
    const service = new RbacService(fakeAuditService(), fakeResolver());

    const result = await service.setParentRole("role-1", null, "actor-1");

    expect(result.parentRoleId).toBeNull();
  });
});

describe("RbacService.getRoleAncestors / getEffectivePermissions", () => {
  it("delegates to the permission resolver", async () => {
    const resolver = fakeResolver(["parent-1"]);
    const service = new RbacService(fakeAuditService(), resolver);

    const ancestors = await service.getRoleAncestors("role-1");

    expect(ancestors).toEqual(["parent-1"]);
    expect(resolver.getAncestorChain).toHaveBeenCalledWith("role-1");
  });
});
