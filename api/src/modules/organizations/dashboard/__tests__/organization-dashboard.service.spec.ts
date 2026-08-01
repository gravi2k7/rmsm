import { NotFoundError } from "@rmsm/shared";
import type { Organization, OrganizationMembershipWithUser } from "@rmsm/database";
import { OrganizationDashboardService } from "../organization-dashboard.service";
import type { OrganizationRepository } from "../../repositories/organization.repository";
import type { OrganizationMembershipRepository } from "../../repositories/membership.repository";
import type { OrganizationStatisticsService } from "../../services/statistics.service";
import type { SessionRepository } from "../../../auth/repositories/session.repository";
import type { AuditLogRepository } from "../../../auth/repositories/audit-log.repository";
import type { OrganizationSubscriptionRepository } from "../../../billing/repositories/organization-subscription.repository";
import type { UsageService } from "../../../billing/services/usage.service";

function buildOrganization(overrides: Partial<Organization> = {}): Organization {
  const now = new Date();
  return {
    id: "org-1",
    name: "Acme",
    slug: "acme",
    logoUrl: null,
    description: null,
    timezone: "UTC",
    currency: "USD",
    country: null,
    website: null,
    settings: {},
    status: "ACTIVE",
    billingCustomerId: null,
    seatsLimit: null,
    createdById: "user-1",
    updatedById: "user-1",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    displayName: null,
    email: null,
    phone: null,
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    locale: "en-US",
    ...overrides,
  } as Organization;
}

describe("OrganizationDashboardService", () => {
  it("throws NotFoundError when the organization doesn't exist", async () => {
    const organizationRepository = { findById: jest.fn().mockResolvedValue(null) } as unknown as OrganizationRepository;
    const service = new OrganizationDashboardService(
      organizationRepository,
      {} as OrganizationMembershipRepository,
      {} as OrganizationStatisticsService,
      {} as SessionRepository,
      {} as AuditLogRepository,
      {} as OrganizationSubscriptionRepository,
      {} as UsageService,
    );

    await expect(service.getDashboard("org-1")).rejects.toThrow(NotFoundError);
  });

  it("composes statistics/sessions/subscription/usage/recent-activity scoped to the org's active member user ids", async () => {
    const organization = buildOrganization();
    const organizationRepository = { findById: jest.fn().mockResolvedValue(organization) } as unknown as OrganizationRepository;

    const activeMembers = [
      { userId: "user-1" },
      { userId: "user-2" },
    ] as OrganizationMembershipWithUser[];
    const membershipRepository = {
      findActiveByOrganization: jest.fn().mockResolvedValue(activeMembers),
    } as unknown as OrganizationMembershipRepository;

    const statistics = { organizationId: "org-1", memberCount: 2 } as never;
    const statisticsService = { getStatistics: jest.fn().mockResolvedValue(statistics) } as unknown as OrganizationStatisticsService;

    const countActiveByUserIds = jest.fn().mockResolvedValue(3);
    const sessionRepository = { countActiveByUserIds } as unknown as SessionRepository;

    const subscription = { id: "sub-1" } as never;
    const subscriptionRepository = {
      findByOrganizationId: jest.fn().mockResolvedValue(subscription),
    } as unknown as OrganizationSubscriptionRepository;

    const usage = [{ id: "usage-1" }] as never;
    const usageService = { getCurrentUsage: jest.fn().mockResolvedValue(usage) } as unknown as UsageService;

    const recentActivity = [{ id: "audit-1" }] as never;
    const auditLogRepository = {
      findByEntity: jest.fn().mockResolvedValue(recentActivity),
    } as unknown as AuditLogRepository;

    const service = new OrganizationDashboardService(
      organizationRepository,
      membershipRepository,
      statisticsService,
      sessionRepository,
      auditLogRepository,
      subscriptionRepository,
      usageService,
    );

    const dashboard = await service.getDashboard("org-1");

    expect(countActiveByUserIds).toHaveBeenCalledWith(["user-1", "user-2"]);
    expect(auditLogRepository.findByEntity).toHaveBeenCalledWith("Organization", "org-1", 20);
    expect(dashboard).toEqual({
      organization: {
        id: "org-1",
        name: "Acme",
        displayName: null,
        slug: "acme",
        status: "ACTIVE",
        logoUrl: null,
        createdAt: organization.createdAt,
      },
      statistics,
      activeSessions: 3,
      subscription,
      usage,
      recentActivity,
    });
  });
});
