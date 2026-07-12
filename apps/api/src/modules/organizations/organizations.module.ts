import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrganizationRepository } from "./repositories/organization.repository";
import { OrganizationMembershipRepository } from "./repositories/membership.repository";
import { OrganizationMembershipEventRepository } from "./repositories/membership-event.repository";
import { OrganizationInvitationRepository } from "./repositories/invitation.repository";
import { OrganizationService } from "./services/organization.service";
import { OrganizationMembershipService } from "./services/membership.service";
import { OrganizationInvitationService } from "./services/invitation.service";
import { OrganizationStatisticsService } from "./services/statistics.service";
import { OrganizationRoleGuard } from "./guards/organization-role.guard";
import { OrganizationController } from "./organization.controller";
import { MembershipController } from "./membership.controller";
import { InvitationController } from "./invitation.controller";
import { OrganizationStatisticsController } from "./statistics.controller";

/**
 * Phase 4 additions to this module: 4 controllers, OrganizationRoleGuard,
 * OrganizationStatisticsService. Every Phase 2/3 provider below is
 * unchanged — only the module's `controllers` array and two new providers
 * (OrganizationRoleGuard, OrganizationStatisticsService) were added.
 */
@Module({
  imports: [AuthModule],
  controllers: [OrganizationController, MembershipController, InvitationController, OrganizationStatisticsController],
  providers: [
    OrganizationRepository,
    OrganizationMembershipRepository,
    OrganizationMembershipEventRepository,
    OrganizationInvitationRepository,
    OrganizationService,
    OrganizationMembershipService,
    OrganizationInvitationService,
    OrganizationStatisticsService,
    OrganizationRoleGuard,
  ],
  exports: [
    OrganizationService,
    OrganizationMembershipService,
    OrganizationInvitationService,
    OrganizationStatisticsService,
    OrganizationRepository,
    OrganizationMembershipRepository,
    OrganizationMembershipEventRepository,
    OrganizationInvitationRepository,
  ],
})
export class OrganizationsModule {}
