import { prisma } from "@rmsm/database";

/**
 * Cleanup, not seeding in the Module 002 sense (that's
 * packages/database/prisma/seed.ts, which seeds permanent reference data —
 * roles/permissions — once per environment). This is per-test-run teardown:
 * every factory in test/factories/ generates emails/slugs containing a
 * timestamp, so this can safely delete anything matching the test prefix
 * without touching real data, and is safe to run against a shared test
 * database between suites.
 */
export async function cleanupTestData(): Promise<void> {
  // Order matters: children before parents, respecting FK constraints
  // (though every FK in this schema is Cascade or SetNull from the parent
  // side — deleting users/organizations directly would cascade correctly
  // too, but explicit ordering here is clearer about what's being cleaned
  // and doesn't rely on cascade behavior being correct as an implicit test
  // dependency).
  await prisma.organizationMembershipEvent.deleteMany({ where: { organization: { slug: { contains: "test-org-" } } } });
  await prisma.organizationInvitation.deleteMany({ where: { organization: { slug: { contains: "test-org-" } } } });
  await prisma.organizationMembership.deleteMany({ where: { organization: { slug: { contains: "test-org-" } } } });
  await prisma.organization.deleteMany({ where: { slug: { contains: "test-org-" } } });
  await prisma.auditLog.deleteMany({ where: { user: { email: { contains: "test-user-" } } } });
  await prisma.loginHistory.deleteMany({ where: { email: { contains: "test-user-" } } });
  await prisma.user.deleteMany({ where: { email: { contains: "test-user-" } } });
}

/** Ensures the reference-data seed (roles/permissions) has run — fails fast with a clear message rather than every test failing individually with an opaque "role not found." */
export async function assertReferenceDataSeeded(): Promise<void> {
  const superAdmin = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdmin) {
    throw new Error(
      "Reference data not seeded. Run `pnpm --filter @rmsm/database seed` before running integration tests.",
    );
  }
}
