import { LicenseService } from "../license.service";
import type { LicenseRepository } from "../../repositories/license.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import { ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";
import type { License } from "@rmsm/database";

function fakeLicense(overrides: Partial<License> = {}): License {
  return {
    id: "lic-1",
    key: "LIC-ABCD-1234",
    type: "ENTERPRISE",
    seats: 10,
    organizationId: null,
    status: "UNASSIGNED",
    issuedAt: new Date(),
    expiresAt: null,
    assignedAt: null,
    assignedById: null,
    revokedAt: null,
    revokedById: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as License;
}

function fakeRepo(): jest.Mocked<LicenseRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByKey: jest.fn(),
    findByOrganization: jest.fn(),
    list: jest.fn(),
    assign: jest.fn(),
    revoke: jest.fn(),
    markExpired: jest.fn(),
    findExpiringBefore: jest.fn(),
  } as unknown as jest.Mocked<LicenseRepository>;
}

function fakeAudit(): jest.Mocked<AuditService> {
  return { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
}

function fakePublisher(): jest.Mocked<DomainEventPublisher> {
  return { publish: jest.fn(), on: jest.fn(), off: jest.fn() } as unknown as jest.Mocked<DomainEventPublisher>;
}

describe("LicenseService", () => {
  let repo: jest.Mocked<LicenseRepository>;
  let audit: jest.Mocked<AuditService>;
  let publisher: jest.Mocked<DomainEventPublisher>;
  let service: LicenseService;

  beforeEach(() => {
    repo = fakeRepo();
    audit = fakeAudit();
    publisher = fakePublisher();
    service = new LicenseService(repo, audit, publisher);
  });

  it("issues a license with a generated key", async () => {
    repo.create.mockResolvedValue(fakeLicense());
    const result = await service.issueLicense({ type: "ENTERPRISE", seats: 10 }, "actor-1");
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ type: "ENTERPRISE", seats: 10 }));
    expect(result.key).toBe("LIC-ABCD-1234");
    expect(audit.log).toHaveBeenCalledWith("license.issued", expect.objectContaining({ userId: "actor-1" }));
  });

  it("throws NotFoundError when getById can't find a license", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById("missing")).rejects.toThrow(NotFoundError);
  });

  it("assigns an unassigned license to an organization and publishes LicenseAssigned", async () => {
    repo.findById.mockResolvedValue(fakeLicense({ status: "UNASSIGNED" }));
    repo.assign.mockResolvedValue(fakeLicense({ status: "ACTIVE", organizationId: "org-1", assignedAt: new Date() }));

    const result = await service.assignToOrganization("lic-1", "org-1", "actor-1");

    expect(repo.assign).toHaveBeenCalledWith("lic-1", "org-1", "actor-1");
    expect(publisher.publish).toHaveBeenCalledWith(
      "LicenseAssigned",
      expect.objectContaining({ licenseId: "lic-1", organizationId: "org-1" }),
    );
    expect(result.status).toBe("ACTIVE");
  });

  it("refuses to reassign a license already ACTIVE for a different organization", async () => {
    repo.findById.mockResolvedValue(fakeLicense({ status: "ACTIVE", organizationId: "org-other" }));
    await expect(service.assignToOrganization("lic-1", "org-1", "actor-1")).rejects.toThrow(ConflictError);
    expect(repo.assign).not.toHaveBeenCalled();
  });

  it("refuses to reassign a REVOKED license", async () => {
    repo.findById.mockResolvedValue(fakeLicense({ status: "REVOKED" }));
    await expect(service.assignToOrganization("lic-1", "org-1", "actor-1")).rejects.toThrow(ValidationError);
  });

  it("revokes an ACTIVE license", async () => {
    repo.findById.mockResolvedValue(fakeLicense({ status: "ACTIVE", organizationId: "org-1" }));
    repo.revoke.mockResolvedValue(fakeLicense({ status: "REVOKED" }));

    const result = await service.revoke("lic-1", "actor-1");

    expect(repo.revoke).toHaveBeenCalledWith("lic-1", "actor-1");
    expect(result.status).toBe("REVOKED");
  });

  it("refuses to revoke a license that isn't ACTIVE", async () => {
    repo.findById.mockResolvedValue(fakeLicense({ status: "UNASSIGNED" }));
    await expect(service.revoke("lic-1", "actor-1")).rejects.toThrow(ValidationError);
  });

  it("expireOverdueLicenses marks every expiring license EXPIRED", async () => {
    repo.findExpiringBefore.mockResolvedValue([fakeLicense({ id: "a" }), fakeLicense({ id: "b" })]);
    repo.markExpired.mockResolvedValue(fakeLicense());

    const count = await service.expireOverdueLicenses();

    expect(count).toBe(2);
    expect(repo.markExpired).toHaveBeenCalledTimes(2);
  });
});
