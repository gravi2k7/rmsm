const mockPrisma = {
  userRole: { findMany: jest.fn() },
  role: { findUnique: jest.fn() },
};

jest.mock("@rmsm/database", () => ({
  prisma: mockPrisma,
}));

import { PermissionResolverService } from "../services/permission-resolver.service";

function role(id: string, permissionKeys: string[], parentRoleId: string | null = null) {
  return {
    id,
    parentRoleId,
    rolePermissions: permissionKeys.map((key) => ({ permission: { key } })),
  };
}

describe("PermissionResolverService.resolveForUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns the direct permissions of a user's own role when there is no hierarchy", async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([{ role: role("role-1", ["users.read", "users.write"]) }]);

    const resolver = new PermissionResolverService();
    const permissions = await resolver.resolveForUser("user-1");

    expect(permissions.sort()).toEqual(["users.read", "users.write"]);
  });

  it("includes permissions inherited from a parent role", async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([{ role: role("child", ["child.perm"], "parent") }]);
    mockPrisma.role.findUnique.mockResolvedValue(role("parent", ["parent.perm"]));

    const resolver = new PermissionResolverService();
    const permissions = await resolver.resolveForUser("user-1");

    expect(permissions.sort()).toEqual(["child.perm", "parent.perm"]);
  });

  it("walks multiple levels of hierarchy (grandparent inheritance)", async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([{ role: role("child", ["child.perm"], "parent") }]);
    mockPrisma.role.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "parent") return Promise.resolve(role("parent", ["parent.perm"], "grandparent"));
      if (where.id === "grandparent") return Promise.resolve(role("grandparent", ["grandparent.perm"]));
      return Promise.resolve(null);
    });

    const resolver = new PermissionResolverService();
    const permissions = await resolver.resolveForUser("user-1");

    expect(permissions.sort()).toEqual(["child.perm", "grandparent.perm", "parent.perm"]);
  });

  it("deduplicates a permission granted at multiple levels", async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([{ role: role("child", ["shared.perm"], "parent") }]);
    mockPrisma.role.findUnique.mockResolvedValue(role("parent", ["shared.perm"]));

    const resolver = new PermissionResolverService();
    const permissions = await resolver.resolveForUser("user-1");

    expect(permissions).toEqual(["shared.perm"]);
  });

  it("does not hang on a cyclic hierarchy — stops resolving further inheritance at the cycle", async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([{ role: role("a", ["a.perm"], "b") }]);
    mockPrisma.role.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === "b") return Promise.resolve(role("b", ["b.perm"], "a")); // cycle: a -> b -> a
      return Promise.resolve(null);
    });

    const resolver = new PermissionResolverService();
    const permissions = await resolver.resolveForUser("user-1");

    expect(permissions.sort()).toEqual(["a.perm", "b.perm"]);
  });

  it("merges permissions across multiple roles assigned to the same user", async () => {
    mockPrisma.userRole.findMany.mockResolvedValue([
      { role: role("role-a", ["a.perm"]) },
      { role: role("role-b", ["b.perm"]) },
    ]);

    const resolver = new PermissionResolverService();
    const permissions = await resolver.resolveForUser("user-1");

    expect(permissions.sort()).toEqual(["a.perm", "b.perm"]);
  });
});

describe("PermissionResolverService.getAncestorChain", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty chain for a role with no parent", async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ parentRoleId: null });

    const resolver = new PermissionResolverService();
    expect(await resolver.getAncestorChain("role-1")).toEqual([]);
  });

  it("returns the full chain, nearest-first", async () => {
    mockPrisma.role.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      const chain: Record<string, string | null> = { child: "parent", parent: "grandparent", grandparent: null };
      return Promise.resolve({ parentRoleId: chain[where.id] ?? null });
    });

    const resolver = new PermissionResolverService();
    expect(await resolver.getAncestorChain("child")).toEqual(["parent", "grandparent"]);
  });

  it("terminates on a cycle instead of looping forever", async () => {
    mockPrisma.role.findUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      const chain: Record<string, string> = { a: "b", b: "a" };
      return Promise.resolve({ parentRoleId: chain[where.id] ?? null });
    });

    const resolver = new PermissionResolverService();
    const chain = await resolver.getAncestorChain("a");
    expect(chain.length).toBeLessThanOrEqual(2);
  });
});
