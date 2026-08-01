// OrganizationController statically imports OrganizationService (which
// transitively imports the real `prisma` singleton) — same reasoning as
// membership.controller.spec.ts's @rmsm/database mock.
jest.mock("@rmsm/database", () => ({ prisma: {} }));

import { OrganizationController } from "../organization.controller";
import type { OrganizationService } from "../services/organization.service";
import type { OrganizationMembershipService } from "../services/membership.service";

describe("OrganizationController — Module 003 routes", () => {
  function buildController(overrides: {
    organizationService?: Partial<OrganizationService>;
    membershipService?: Partial<OrganizationMembershipService>;
  } = {}) {
    const organizationService = (overrides.organizationService ?? {}) as OrganizationService;
    const membershipService = (overrides.membershipService ?? {}) as OrganizationMembershipService;
    return new OrganizationController(organizationService, membershipService);
  }

  const user = { sub: "user-1" } as never;
  const req = { headers: {}, ip: "127.0.0.1" } as never;

  it("getCurrentOrganization forwards the header-resolved organizationId to OrganizationService.getById", async () => {
    const getById = jest.fn().mockResolvedValue({ id: "org-1" });
    const controller = buildController({ organizationService: { getById } });

    const result = await controller.getCurrentOrganization("org-1");

    expect(getById).toHaveBeenCalledWith("org-1");
    expect(result).toEqual({ id: "org-1" });
  });

  it("updateCurrentOrganizationProfile forwards organizationId, dto, actor id, and request context to updateDetails", async () => {
    const updateDetails = jest.fn().mockResolvedValue({ id: "org-1" });
    const controller = buildController({ organizationService: { updateDetails } });
    const dto = { displayName: "New Name" };

    await controller.updateCurrentOrganizationProfile("org-1", dto, user, req);

    expect(updateDetails).toHaveBeenCalledWith("org-1", dto, "user-1", expect.any(Object));
  });

  it("updateCurrentOrganizationSettings forwards to updateSettingsCategories", async () => {
    const updateSettingsCategories = jest.fn().mockResolvedValue({ id: "org-1" });
    const controller = buildController({ organizationService: { updateSettingsCategories } });
    const dto = { general: { defaultLanguage: "en-US" } };

    await controller.updateCurrentOrganizationSettings("org-1", dto, user, req);

    expect(updateSettingsCategories).toHaveBeenCalledWith("org-1", dto, "user-1", expect.any(Object));
  });

  it("updateCurrentOrganizationBranding forwards to updateBranding", async () => {
    const updateBranding = jest.fn().mockResolvedValue({ id: "org-1" });
    const controller = buildController({ organizationService: { updateBranding } });
    const dto = { primaryColor: "#123456" };

    await controller.updateCurrentOrganizationBranding("org-1", dto, user, req);

    expect(updateBranding).toHaveBeenCalledWith("org-1", dto, "user-1", expect.any(Object));
  });

  it("transferOwner delegates to the same OrganizationMembershipService.transferOwnership used by the original MembershipController route", async () => {
    const transferOwnership = jest.fn().mockResolvedValue({ previousOwner: {}, newOwner: {} });
    const controller = buildController({ membershipService: { transferOwnership } });

    await controller.transferOwner("org-1", { toMembershipId: "mem-2" }, user, req);

    expect(transferOwnership).toHaveBeenCalledWith("org-1", "mem-2", "user-1", expect.any(Object));
  });
});
