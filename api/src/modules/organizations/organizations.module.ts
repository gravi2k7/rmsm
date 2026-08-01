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
import { CurrentOrganizationGuard } from "./guards/current-organization.guard";
import { OrganizationEventPublisher } from "./events/organization-event-publisher.service";
import { OrganizationController } from "./organization.controller";
import { MembershipController } from "./membership.controller";
import { InvitationController } from "./invitation.controller";
import { OrganizationStatisticsController } from "./statistics.controller";

/**
 * Phase 4 additions to this module: 4 controllers, OrganizationRoleGuard,
 * OrganizationStatisticsService. Every Phase 2/3 provider below is
 * unchanged — only the module's `controllers` array and two new providers
 * (OrganizationRoleGuard, OrganizationStatisticsService) were added.
 *
 * Module 003 additions (additive, same pattern): CurrentOrganizationGuard
 * (resolves "current organization" from an X-Organization-Id header for
 * the new `/organizations/current/*` routes) and OrganizationEventPublisher
 * (in-process publisher for the 5 Organization domain events). No
 * existing provider, controller, or export was removed or changed.
 * OrganizationDashboardService/Controller live in a separate
 * OrganizationDashboardModule (see dashboard/organization-dashboard.module.ts)
 * rather than here, to avoid a circular dependency with BillingModule.
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
    CurrentOrganizationGuard,
    OrganizationEventPublisher,
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
    OrganizationEventPublisher,
  ],
})
export class OrganizationsModule {}
