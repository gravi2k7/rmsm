import { ConflictError, ValidationError } from "@rmsm/shared";
import type { Organization } from "@rmsm/database";

// createOrganization() is the only method here that touches `prisma`
// directly (for `$transaction`); every other method under test goes
// through the constructor-injected repositories, mocked the same way as
// membership.service.spec.ts / invitation.service.spec.ts. `$transaction`
// just invokes the callback with a stub client.
jest.mock("@rmsm/database", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({}),
  },
}));

import { OrganizationService } from "../organization.service";
import type { OrganizationRepository } from "../../repositories/organization.repository";
import type { OrganizationMembershipRepository } from "../../repositories/membership.repository";
import type { OrganizationMembershipEventRepository } from "../../repositories/membership-event.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { OrganizationEventPublisher } from "../../events/organization-event-publisher.service";

/**
 * Module 003 unit coverage for OrganizationService: the two new methods
 * (updateSettingsCategories, updateBranding) and domain-event publication
 * on the pre-existing lifecycle methods. Hand-rolled repository/service
 * mocks, same style as membership.service.spec.ts — no database required.
 */
describe("OrganizationService — Module 003 additions", () => {
  type OrgRepoMock = jest.Mocked<
    Pick<OrganizationRepository, "findById" | "findBySlug" | "updateDetails" | "create" | "archive" | "softDelete">
  >;
  type MembershipRepoMock = jest.Mocked<Pick<OrganizationMembershipRepository, "create">>;
  type MembershipEventRepoMock = jest.Mocked<Pick<OrganizationMembershipEventRepository, "create">>;
  type AuditServiceMock = jest.Mocked<Pick<AuditService, "log">>;
  type EventPublisherMock = jest.Mocked<Pick<OrganizationEventPublisher, "publish">>;

  function buildOrganization(overrides: Partial<Organization> = {}): Organization {
    const now = new Date();
    return {
      id: "org-1",
      name: "Acme Trading Desk",
      slug: "acme-trading-desk",
      logoUrl: null,
      description: null,
      timezone: "UTC",
      currency: "USD",
      country: null,
      website: null,
      settings: { general: { defaultLanguage: "en-US" } },
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

  function buildService() {
    const organizationRepository: OrgRepoMock = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      updateDetails: jest.fn(),
      create: jest.fn(),
      archive: jest.fn(),
      softDelete: jest.fn(),
    };
    const membershipRepository: MembershipRepoMock = { create: jest.fn() };
    const membershipEventRepository: MembershipEventRepoMock = { create: jest.fn() };
    const auditService: AuditServiceMock = { log: jest.fn().mockResolvedValue({}) };
    const eventPublisher: EventPublisherMock = { publish: jest.fn() };

    const service = new OrganizationService(
      organizationRepository as unknown as OrganizationRepository,
      membershipRepository as unknown as OrganizationMembershipRepository,
      membershipEventRepository as unknown as OrganizationMembershipEventRepository,
      auditService as unknown as AuditService,
      eventPublisher as unknown as OrganizationEventPublisher,
    );
    return { service, organizationRepository, membershipRepository, membershipEventRepository, auditService, eventPublisher };
  }

  describe("updateSettingsCategories", () => {
    it("merges only the provided categories, leaving other existing categories untouched", async () => {
      const { service, organizationRepository } = buildService();
      const existing = buildOrganization({
        settings: { general: { defaultLanguage: "en-US" }, branding: { primaryColor: "#000000" } },
      });
      organizationRepository.findById.mockResolvedValue(existing);
      organizationRepository.updateDetails.mockResolvedValue(buildOrganization());

      await service.updateSettingsCategories(
        "org-1",
        { security: { requireMfaForAdmins: true } },
        "actor-1",
      );

      expect(organizationRepository.updateDetails).toHaveBeenCalledWith(
        "org-1",
        {
          settings: {
            general: { defaultLanguage: "en-US" },
            branding: { primaryColor: "#000000" },
            security: { requireMfaForAdmins: true },
          },
        },
        "actor-1",
      );
    });

    it("rejects an empty settings PATCH (no category provided)", async () => {
      const { service, organizationRepository } = buildService();
      organizationRepository.findById.mockResolvedValue(buildOrganization());

      await expect(service.updateSettingsCategories("org-1", {}, "actor-1")).rejects.toThrow(ValidationError);
      expect(organizationRepository.updateDetails).not.toHaveBeenCalled();
    });

    it("logs an audit entry and publishes an OrganizationUpdated event scoped to the changed categories", async () => {
      const { service, organizationRepository, auditService, eventPublisher } = buildService();
      organizationRepository.findById.mockResolvedValue(buildOrganization());
      organizationRepository.updateDetails.mockResolvedValue(buildOrganization());

      await service.updateSettingsCategories(
        "org-1",
        { passwordPolicy: { minLength: 12 }, mfaPolicy: { required: true } },
        "actor-1",
      );

      expect(auditService.log).toHaveBeenCalledWith(
        "organization.settings.updated",
        expect.objectContaining({ metadata: { categories: ["passwordPolicy", "mfaPolicy"] } }),
      );
      expect(eventPublisher.publish).toHaveBeenCalledWith("OrganizationUpdated", {
        organizationId: "org-1",
        actorId: "actor-1",
        fields: ["settings.passwordPolicy", "settings.mfaPolicy"],
      });
    });
  });

  describe("updateBranding", () => {
    it("merges branding fields into settings.branding and passes logoUrl through to the top-level column", async () => {
      const { service, organizationRepository } = buildService();
      organizationRepository.findById.mockResolvedValue(
        buildOrganization({ settings: { branding: { primaryColor: "#000000", secondaryColor: "#ffffff" } } }),
      );
      organizationRepository.updateDetails.mockResolvedValue(buildOrganization());

      await service.updateBranding(
        "org-1",
        { primaryColor: "#123456", logoUrl: "https://example.com/logo.png" },
        "actor-1",
      );

      expect(organizationRepository.updateDetails).toHaveBeenCalledWith(
        "org-1",
        {
          settings: { branding: { primaryColor: "#123456", secondaryColor: "#ffffff" } },
          logoUrl: "https://example.com/logo.png",
        },
        "actor-1",
      );
    });

    it("leaves logoUrl untouched (undefined) when not provided", async () => {
      const { service, organizationRepository } = buildService();
      organizationRepository.findById.mockResolvedValue(buildOrganization({ settings: {} }));
      organizationRepository.updateDetails.mockResolvedValue(buildOrganization());

      await service.updateBranding("org-1", { accentColor: "#abcdef" }, "actor-1");

      expect(organizationRepository.updateDetails).toHaveBeenCalledWith(
        "org-1",
        { settings: { branding: { accentColor: "#abcdef" } }, logoUrl: undefined },
        "actor-1",
      );
    });
  });

  describe("domain event publication on existing lifecycle methods", () => {
    it("createOrganization publishes OrganizationCreated", async () => {
      const { service, organizationRepository, eventPublisher } = buildService();
      organizationRepository.findBySlug.mockResolvedValue(null);
      const created = buildOrganization();
      organizationRepository.create.mockResolvedValue(created);

      await service.createOrganization({ name: "Acme Trading Desk", slug: "acme-trading-desk" }, "owner-1");

      expect(eventPublisher.publish).toHaveBeenCalledWith("OrganizationCreated", {
        organizationId: "org-1",
        actorId: "owner-1",
        slug: "acme-trading-desk",
        name: "Acme Trading Desk",
      });
    });

    it("archive publishes OrganizationArchived", async () => {
      const { service, organizationRepository, eventPublisher } = buildService();
      organizationRepository.findById.mockResolvedValue(buildOrganization({ status: "ACTIVE" }));
      organizationRepository.archive.mockResolvedValue(buildOrganization({ status: "ARCHIVED" }));

      await service.archive("org-1", "actor-1");

      expect(eventPublisher.publish).toHaveBeenCalledWith("OrganizationArchived", {
        organizationId: "org-1",
        actorId: "actor-1",
      });
    });

    it("softDelete publishes OrganizationDeleted", async () => {
      const { service, organizationRepository, eventPublisher } = buildService();
      organizationRepository.findById.mockResolvedValue(buildOrganization({ status: "ACTIVE" }));
      organizationRepository.softDelete.mockResolvedValue(buildOrganization({ status: "DELETED" }));

      await service.softDelete("org-1", "actor-1");

      expect(eventPublisher.publish).toHaveBeenCalledWith("OrganizationDeleted", {
        organizationId: "org-1",
        actorId: "actor-1",
      });
    });

    it("archive on an already-ARCHIVED organization throws ConflictError and does not publish", async () => {
      const { service, organizationRepository, eventPublisher } = buildService();
      organizationRepository.findById.mockResolvedValue(buildOrganization({ status: "ARCHIVED" }));

      await expect(service.archive("org-1", "actor-1")).rejects.toThrow(ConflictError);
      expect(eventPublisher.publish).not.toHaveBeenCalled();
    });
  });
});
