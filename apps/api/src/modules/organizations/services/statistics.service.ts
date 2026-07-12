import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import { OrganizationMembershipRepository } from "../repositories/membership.repository";
import { OrganizationInvitationRepository } from "../repositories/invitation.repository";
import { OrganizationRepository } from "../repositories/organization.repository";

export interface OrganizationStatistics {
  organizationId: string;
  memberCount: number;
  invitationCount: number;
  ownerCount: number;
  administratorCount: number;
  activeMembers: number;
  pendingInvitations: number;
  suspendedMembers: number;
}

/**
 * Phase 4 addition — a new, read-only service, not a modification of
 * OrganizationService/OrganizationMembershipService/OrganizationInvitationService.
 * Composes existing repository methods (several of which were themselves
 * small additive Phase 4 methods — see FILES_CHANGED.md) rather than
 * duplicating any counting logic those repositories already own.
 */
@Injectable()
export class OrganizationStatisticsService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly invitationRepository: OrganizationInvitationRepository,
  ) {}

  async getStatistics(organizationId: string): Promise<OrganizationStatistics> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) throw new NotFoundError("Organization", organizationId);

    const [activeMembers, suspendedMembers, ownerCount, administratorCount, pendingInvitations] =
      await Promise.all([
        this.membershipRepository.countByStatus(organizationId, "ACTIVE"),
        this.membershipRepository.countByStatus(organizationId, "SUSPENDED"),
        this.membershipRepository.countActiveByRole(organizationId, "OWNER"),
        this.membershipRepository.countActiveByRole(organizationId, "ADMINISTRATOR"),
        this.invitationRepository.countPendingByOrganization(organizationId),
      ]);

    return {
      organizationId,
      memberCount: activeMembers + suspendedMembers,
      invitationCount: pendingInvitations,
      ownerCount,
      administratorCount,
      activeMembers,
      pendingInvitations,
      suspendedMembers,
    };
  }
}
