import { prisma, OrganizationMembership, OrganizationRole, MembershipStatus } from "@rmsm/database";

/**
 * Direct membership creation for test setup that doesn't need to go
 * through invitation acceptance (e.g. "given a SUSPENDED member, assert
 * X"). Tests that specifically exercise the invitation flow use
 * InvitationFactory + the real acceptInvitation() endpoint instead — this
 * factory is for arranging preconditions, not for testing the join flow
 * itself.
 */
export async function createTestMembership(
  organizationId: string,
  userId: string,
  role: OrganizationRole = "VIEWER",
  status: MembershipStatus = "ACTIVE",
): Promise<OrganizationMembership> {
  return prisma.organizationMembership.create({
    data: { organizationId, userId, role, status },
  });
}

export async function setMembershipStatus(membershipId: string, status: MembershipStatus): Promise<void> {
  await prisma.organizationMembership.update({ where: { id: membershipId }, data: { status } });
}
