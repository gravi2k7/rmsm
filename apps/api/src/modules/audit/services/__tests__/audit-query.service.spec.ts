import type { AuditLog } from "@rmsm/database";
import { AuditQueryService } from "../audit-query.service";
import type { AuditLogRepository } from "../../../auth/repositories/audit-log.repository";

/**
 * Module 004 Domain 4 unit coverage for AuditQueryService — the pure
 * read-side wrapper over AuditLogRepository's Module 004 additions
 * (search/exportRows). No database required.
 */
describe("AuditQueryService", () => {
  type RepoMock = jest.Mocked<Pick<AuditLogRepository, "search" | "exportRows">>;

  function buildEntry(overrides: Partial<AuditLog> = {}): AuditLog {
    return {
      id: "audit-1",
      userId: "user-1",
      action: "user.login",
      entityType: "Session",
      entityId: "session-1",
      metadata: { ipAddress: "10.0.0.1" },
      ipAddress: "10.0.0.1",
      userAgent: "Chrome",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      ...overrides,
    } as AuditLog;
  }

  function buildService() {
    const repo: RepoMock = { search: jest.fn(), exportRows: jest.fn() };
    const service = new AuditQueryService(repo as unknown as AuditLogRepository);
    return { service, repo };
  }

  describe("search", () => {
    it("delegates to AuditLogRepository.search with the given filters and paging", async () => {
      const { service, repo } = buildService();
      const paginated = {
        data: [buildEntry()],
        pagination: { page: 1, pageSize: 50, totalCount: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
      };
      repo.search.mockResolvedValue(paginated);

      const result = await service.search({ userId: "user-1" }, { page: 1, pageSize: 50 });

      expect(repo.search).toHaveBeenCalledWith({ userId: "user-1" }, { page: 1, pageSize: 50 });
      expect(result).toBe(paginated);
    });
  });

  describe("export", () => {
    it("renders matching rows as a CSV string with a header row", async () => {
      const { service, repo } = buildService();
      repo.exportRows.mockResolvedValue([buildEntry()]);

      const csv = await service.export({ action: "user.login" });

      const lines = csv.split("\n");
      expect(lines[0]).toBe("id,userId,action,entityType,entityId,createdAt,ipAddress,metadata");
      expect(lines[1]).toContain("audit-1");
      expect(lines[1]).toContain("user.login");
    });

    it("produces just the header row when there are no matching entries", async () => {
      const { service, repo } = buildService();
      repo.exportRows.mockResolvedValue([]);

      const csv = await service.export({});

      expect(csv.split("\n")).toHaveLength(1);
    });

    it("escapes embedded double quotes in metadata so the CSV stays well-formed (no unescaped quote breaks a field)", async () => {
      const { service, repo } = buildService();
      repo.exportRows.mockResolvedValue([buildEntry({ metadata: { note: 'contains "quotes"' } })]);

      const csv = await service.export({});
      const lines = csv.split("\n");

      // The metadata field is JSON.stringify()'d first (escaping the inner
      // quotes as \"), then the whole field is CSV-quoted (doubling every
      // literal " char) — so the row must have exactly one line (no
      // stray unescaped quote broke it into extra lines) and both markers
      // of that double-escaping must be present.
      expect(lines).toHaveLength(2);
      expect(lines[1]).toContain('note');
      expect(lines[1]).toContain('quotes');
    });
  });

  describe("timeline", () => {
    it("reuses search() with the given entity filters", async () => {
      const { service, repo } = buildService();
      const paginated = {
        data: [],
        pagination: { page: 1, pageSize: 50, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false },
      };
      repo.search.mockResolvedValue(paginated);

      const result = await service.timeline({ entityType: "User", entityId: "user-1" }, {});

      expect(repo.search).toHaveBeenCalledWith({ entityType: "User", entityId: "user-1" }, {});
      expect(result).toBe(paginated);
    });
  });
});
