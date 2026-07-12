import { prisma } from "@rmsm/database";

/**
 * Grants a user a platform role (e.g. SUBSCRIBER, FREE_USER, ADMIN) for
 * test setup — reuses Module 002's seeded Role table rather than creating
 * ad-hoc roles per test, so authorization tests exercise the same
 * Role/Permission/UserRole data real users have.
 */
export async function grantPlatformRole(userId: string, roleName: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (!role) {
    throw new Error(
      `Role "${roleName}" not found — has the database been seeded? (pnpm --filter @rmsm/database seed)`,
    );
  }

  // Not `upsert` on the userId_roleId_tenantId compound key — same
  // Prisma 5.22 limitation as RbacService.assignRole (tenantId is
  // nullable; SQL treats NULL as never equal to NULL for uniqueness, so
  // the generated compound-key input doesn't accept an explicit `null`
  // the way `upsert`'s `where` needs). findFirst + create instead.
  const existing = await prisma.userRole.findFirst({ where: { userId, roleId: role.id, tenantId: null } });
  if (!existing) {
    await prisma.userRole.create({ data: { userId, roleId: role.id } });
  }
}

/** Convenience for the common case: give a test user full platform access. */
export function grantSuperAdmin(userId: string): Promise<void> {
  return grantPlatformRole(userId, "SUPER_ADMIN");
}

/** Convenience for the common case: an ordinary paying-tier user, which is what most organization tests need. */
export function grantSubscriber(userId: string): Promise<void> {
  return grantPlatformRole(userId, "SUBSCRIBER");
}
