import { Injectable } from "@nestjs/common";
import { AuditLog, Organization, OrganizationSubscriptionWithPlan, UsageRecord } from "@rmsm/database";
import { NotFoundError } from "@rmsm/shared";
import { OrganizationRepository } from "../repositories/organization.repository";
import { OrganizationMembershipRepository } from "../repositories/membership.repository";
import { OrganizationStatisticsService, OrganizationStatistics } from "../services/statistics.service";
import { SessionRepository } from "../../auth/repositories/session.repository";
import { AuditLogRepository } from "../../auth/repositories/audit-log.repository";
import { OrganizationSubscriptionRepository } from "../../billing/repositories/organization-subscription.repository";
import { UsageService } from "../../billing/services/usage.service";

export interface OrganizationDashboard {
  organization: Pick<
    Organization,
    "id" | "name" | "displayName" | "slug" | "status" | "logoUrl" | "createdAt"
  >;
  statistics: OrganizationStatistics;
  activeSessions: number;
  subscription: OrganizationSubscriptionWithPlan | null;
  usage: UsageRecord[];
  recentActivity: AuditLog[];
}

/**
 * Module 003 addition. Composes existing services/repositories from three
 * modules (Organizations, Auth, Billing) into the single read model the
 * "Organization Dashboard" functional requirement asks for — this class
 * introduces no new business logic or persisted state of its own, every
 * field comes from a pre-existing, already-tested read path.
 *
 * Lives in its own module (OrganizationDashboardModule, see
 * organization-dashboard.module.ts) rather than being added to
 * OrganizationsModule's own providers: BillingModule already imports
 * OrganizationsModule (for OrganizationRepository/OrganizationService),
 * so OrganizationsModule importing BillingModule back would be a circular
 * module dependency. A third module that imports both is the standard
 * NestJS way to compose two modules that already depend on a shared one
 * without restructuring either.
 *
 * "Broker Connections" (listed in the spec's Dashboard section) is
 * deliberately NOT included here: no Broker/Connection Prisma model with
 * an organizationId exists anywhere in this schema (BR-001 built only the
 * provider contracts/registry, no persisted per-organization connection
 * state). Inventing a value would violate the "no mock implementations"
 * rule, and inventing the underlying schema/table would be new, out-of-scope
 * infrastructure for this milestone — this gap is called out explicitly
 * in the delivery documentation rather than silently papered over.
 */
@Injectable()
export class OrganizationDashboardService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly statisticsService: OrganizationStatisticsService,
    private readonly sessionRepository: SessionRepository,
    private readonly auditLogRepository: AuditLogRepository,
    private readonly subscriptionRepository: OrganizationSubscriptionRepository,
    private readonly usageService: UsageService,
  ) {}

  async getDashboard(organizationId: string): Promise<OrganizationDashboard> {
    const organization = await this.organizationRepository.findById(organizationId);
    if (!organization) throw new NotFoundError("Organization", organizationId);

    const activeMembers = await this.membershipRepository.findActiveByOrganization(organizationId);
    const activeMemberUserIds = activeMembers.map((m) => m.userId);

    const [statistics, activeSessions, subscription, usage, recentActivity] = await Promise.all([
      this.statisticsService.getStatistics(organizationId),
      this.sessionRepository.countActiveByUserIds(activeMemberUserIds),
      this.subscriptionRepository.findByOrganizationId(organizationId),
      this.usageService.getCurrentUsage(organizationId),
      this.auditLogRepository.findByEntity("Organization", organizationId, 20),
    ]);

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        displayName: organization.displayName,
        slug: organization.slug,
        status: organization.status,
        logoUrl: organization.logoUrl,
        createdAt: organization.createdAt,
      },
      statistics,
      activeSessions,
      subscription,
      usage,
      recentActivity,
    };
  }
}
