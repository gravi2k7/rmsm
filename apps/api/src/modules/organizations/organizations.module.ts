import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrganizationRepository } from "./repositories/organization.repository";
import { OrganizationMembershipRepository } from "./repositories/membership.repository";
import { OrganizationMembershipEventRepository } from "./repositories/membership-event.repository";
import { OrganizationInvitationRepository } from "./repositories/invitation.repository";
import { OrganizationService } from "./services/organization.service";
import { OrganizationMembershipService } from "./services/membership.service";
import { OrganizationInvitationService } from "./services/invitation.service";

/**
 * Phase 3 scope: repositories + services only. Controllers, DTOs, and
 * guards are deferred to the next phase per the Phase-2 Review Response.
 * Imports AuthModule to reuse AuditService, TokenService, and
 * UserRepository — none of that is duplicated here. EmailModule is
 * @Global() (Module 002) so EmailService is available without an explicit
 * import.
 */
@Module({
  imports: [AuthModule],
  providers: [
    OrganizationRepository,
    OrganizationMembershipRepository,
    OrganizationMembershipEventRepository,
    OrganizationInvitationRepository,
    OrganizationService,
    OrganizationMembershipService,
    OrganizationInvitationService,
  ],
  exports: [
    OrganizationService,
    OrganizationMembershipService,
    OrganizationInvitationService,
    OrganizationRepository,
    OrganizationMembershipRepository,
    OrganizationMembershipEventRepository,
    OrganizationInvitationRepository,
  ],
})
export class OrganizationsModule {}
