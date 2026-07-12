import { prisma, Organization, OrganizationRole } from "@rmsm/database";

let counter = 0;

/**
 * Creates a real, persisted Organization + its initial Owner membership —
 * mirrors OrganizationService.createOrganization()'s atomic behavior
 * (organization + owner membership together) without importing the
 * service itself, since factories are test-only infrastructure and should
 * not depend on the code under test for their own correctness.
 */
export async function createTestOrganization(
  ownerUserId: string,
  overrides: { name?: string; slug?: string } = {},
): Promise<Organization> {
  counter += 1;
  const suffix = `${Date.now()}-${counter}`;
  const name = overrides.name ?? `Test Org ${suffix}`;
  const slug = overrides.slug ?? `test-org-${suffix}`;

  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name, slug, createdById: ownerUserId, updatedById: ownerUserId },
    });
    await tx.organizationMembership.create({
      data: { organizationId: org.id, userId: ownerUserId, role: "OWNER" },
    });
    return org;
  });
}

/** Adds an additional member directly (bypassing the invitation flow) for tests that need a pre-existing member of a given role. */
export async function addTestMember(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
): Promise<void> {
  await prisma.organizationMembership.create({
    data: { organizationId, userId, role },
  });
}

export async function deleteTestOrganization(organizationId: string): Promise<void> {
  await prisma.organization.deleteMany({ where: { id: organizationId } });
}
