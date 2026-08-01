import { RenewalService } from "../renewal.service";
import type { OrganizationSubscriptionRepository } from "../../repositories/organization-subscription.repository";
import type { LicenseService } from "../../../licensing/services/license.service";
import type { AuditService } from "../../../auth/services/audit.service";
import type { OrganizationSubscription } from "@rmsm/database";

describe("RenewalService", () => {
  it("sweepTrialsEndingSoon audit-logs every trial ending within the window and returns the count", async () => {
    const trials = [
      { id: "sub-1", organizationId: "org-1", trialEndsAt: new Date() },
      { id: "sub-2", organizationId: "org-2", trialEndsAt: new Date() },
    ] as unknown as OrganizationSubscription[];
    const subscriptionRepository = {
      findTrialsEndingBefore: jest.fn().mockResolvedValue(trials),
    } as unknown as jest.Mocked<OrganizationSubscriptionRepository>;
    const licenseService = { expireOverdueLicenses: jest.fn() } as unknown as jest.Mocked<LicenseService>;
    const audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;

    const service = new RenewalService(subscriptionRepository, licenseService, audit);
    const count = await service.sweepTrialsEndingSoon();

    expect(count).toBe(2);
    expect(audit.log).toHaveBeenCalledTimes(2);
    expect(audit.log).toHaveBeenCalledWith(
      "billing.subscription.trial_ending_soon",
      expect.objectContaining({ entityId: "sub-1" }),
    );
  });

  it("sweepExpiredLicenses delegates to LicenseService and returns its count", async () => {
    const subscriptionRepository = { findTrialsEndingBefore: jest.fn() } as unknown as jest.Mocked<OrganizationSubscriptionRepository>;
    const licenseService = { expireOverdueLicenses: jest.fn().mockResolvedValue(3) } as unknown as jest.Mocked<LicenseService>;
    const audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;

    const service = new RenewalService(subscriptionRepository, licenseService, audit);
    const count = await service.sweepExpiredLicenses();

    expect(count).toBe(3);
    expect(licenseService.expireOverdueLicenses).toHaveBeenCalled();
  });
});
