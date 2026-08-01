import { FeatureFlagAdminService } from "../feature-flag-admin.service";
import type { FeatureFlagRepository } from "../../../billing/repositories/feature-flag.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import { NotFoundError } from "@rmsm/shared";
import type { FeatureFlag } from "@rmsm/database";

function fakeFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: "flag-1",
    key: "ai_requests",
    name: "AI Requests",
    description: null,
    type: "LIMIT",
    isEnabled: true,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as FeatureFlag;
}

function fakeRepo(): jest.Mocked<FeatureFlagRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findByKey: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    setEnabled: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<FeatureFlagRepository>;
}

describe("FeatureFlagAdminService", () => {
  let repo: jest.Mocked<FeatureFlagRepository>;
  let audit: jest.Mocked<AuditService>;
  let publisher: jest.Mocked<DomainEventPublisher>;
  let service: FeatureFlagAdminService;

  beforeEach(() => {
    repo = fakeRepo();
    audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
    publisher = { publish: jest.fn(), on: jest.fn(), off: jest.fn() } as unknown as jest.Mocked<DomainEventPublisher>;
    service = new FeatureFlagAdminService(repo, audit, publisher);
  });

  it("throws NotFoundError for an unknown key", async () => {
    repo.findByKey.mockResolvedValue(null);
    await expect(service.getByKey("missing")).rejects.toThrow(NotFoundError);
  });

  it("toggling a flag off publishes FeatureFlagChanged with isEnabled: false", async () => {
    repo.setEnabled.mockResolvedValue(fakeFlag({ isEnabled: false }));

    const result = await service.setEnabled("flag-1", false, "actor-1");

    expect(repo.setEnabled).toHaveBeenCalledWith("flag-1", false, "actor-1");
    expect(publisher.publish).toHaveBeenCalledWith(
      "FeatureFlagChanged",
      expect.objectContaining({ featureFlagId: "flag-1", isEnabled: false }),
    );
    expect(audit.log).toHaveBeenCalledWith("feature-flag.toggled", expect.objectContaining({ userId: "actor-1" }));
    expect(result.isEnabled).toBe(false);
  });

  it("create() delegates to the repository and audit-logs", async () => {
    repo.create.mockResolvedValue(fakeFlag());
    await service.create({ key: "ai_requests", name: "AI Requests", type: "LIMIT" }, "actor-1");
    expect(repo.create).toHaveBeenCalledWith({ key: "ai_requests", name: "AI Requests", type: "LIMIT" });
    expect(audit.log).toHaveBeenCalledWith("feature-flag.created", expect.anything());
  });

  it("delete() delegates to the repository and audit-logs", async () => {
    await service.delete("flag-1", "actor-1");
    expect(repo.delete).toHaveBeenCalledWith("flag-1");
    expect(audit.log).toHaveBeenCalledWith("feature-flag.deleted", expect.anything());
  });
});
