const mockFindMany = jest.fn();
jest.mock("@rmsm/database", () => ({
  prisma: { auditLog: { findMany: (...args: unknown[]) => mockFindMany(...args) } },
}));

import { AuditLogRepository } from "../audit-log.repository";

describe("AuditLogRepository.findByEntity (Module 003 addition)", () => {
  beforeEach(() => mockFindMany.mockReset());

  it("queries by entityType/entityId, newest first, respecting the take limit", async () => {
    mockFindMany.mockResolvedValue([{ id: "audit-1" }]);
    const repository = new AuditLogRepository();

    const result = await repository.findByEntity("Organization", "org-1", 5);

    expect(result).toEqual([{ id: "audit-1" }]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { entityType: "Organization", entityId: "org-1" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  });

  it("defaults take to 20", async () => {
    mockFindMany.mockResolvedValue([]);
    const repository = new AuditLogRepository();

    await repository.findByEntity("Organization", "org-1");

    expect(mockFindMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
  });
});
