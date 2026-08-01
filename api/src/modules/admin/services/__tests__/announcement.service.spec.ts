import { AnnouncementService } from "../announcement.service";
import type { SystemAnnouncementRepository } from "../../repositories/system-announcement.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import { NotFoundError } from "@rmsm/shared";
import type { SystemAnnouncement } from "@rmsm/database";

function fakeAnnouncement(overrides: Partial<SystemAnnouncement> = {}): SystemAnnouncement {
  return {
    id: "ann-1",
    title: "Scheduled maintenance",
    message: "The platform will be briefly unavailable.",
    severity: "WARNING",
    isActive: true,
    startsAt: null,
    endsAt: null,
    createdById: null,
    updatedById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as SystemAnnouncement;
}

function fakeRepo(): jest.Mocked<SystemAnnouncementRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findActive: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<SystemAnnouncementRepository>;
}

describe("AnnouncementService", () => {
  let repo: jest.Mocked<SystemAnnouncementRepository>;
  let audit: jest.Mocked<AuditService>;
  let service: AnnouncementService;

  beforeEach(() => {
    repo = fakeRepo();
    audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
    service = new AnnouncementService(repo, audit);
  });

  it("creates an announcement and audit-logs with severity metadata", async () => {
    repo.create.mockResolvedValue(fakeAnnouncement());
    const result = await service.create({ title: "Scheduled maintenance", message: "...", severity: "WARNING" }, "actor-1");
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ createdById: "actor-1" }));
    expect(audit.log).toHaveBeenCalledWith(
      "system-announcement.created",
      expect.objectContaining({ metadata: { severity: "WARNING" } }),
    );
    expect(result.title).toBe("Scheduled maintenance");
  });

  it("throws NotFoundError when updating a nonexistent announcement", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update("missing", { title: "x" }, "actor-1")).rejects.toThrow(NotFoundError);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when deleting a nonexistent announcement", async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.delete("missing", "actor-1")).rejects.toThrow(NotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it("deletes an existing announcement", async () => {
    repo.findById.mockResolvedValue(fakeAnnouncement());
    await service.delete("ann-1", "actor-1");
    expect(repo.delete).toHaveBeenCalledWith("ann-1");
    expect(audit.log).toHaveBeenCalledWith("system-announcement.deleted", expect.anything());
  });
});
