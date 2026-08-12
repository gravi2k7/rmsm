import { Injectable } from "@nestjs/common";
import type { AuditLog } from "@rmsm/database";
import type { PaginatedResult, OffsetPaginationQuery } from "@rmsm/database";
import { AuditLogRepository } from "../../auth/repositories/audit-log.repository";

export interface AuditSearchFilters {
  userId?: string;
  action?: string;
  actionPrefix?: string;
  entityType?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
}

/**
 * Module 004 Domain 4 — read-side service over the pre-existing,
 * unmodified `AuditLog` write path (`AuditService.log()`, used by every
 * other module in the codebase). This service adds no new writes; it's
 * purely the search/export/timeline read surface the prompt's Domain 4
 * describes ("Authentication/Authorization/User/Organization Activity
 * Logs, Role/Permission Changes, ... Entity Change Tracking, Audit
 * Search/Filters/Export, Timeline View") over data that was already
 * being captured.
 */
@Injectable()
export class AuditQueryService {
  constructor(private readonly auditLogRepository: AuditLogRepository) {}

  search(filters: AuditSearchFilters, query: OffsetPaginationQuery): Promise<PaginatedResult<AuditLog>> {
    return this.auditLogRepository.search(filters, query);
  }

  async export(filters: AuditSearchFilters): Promise<string> {
    const rows = await this.auditLogRepository.exportRows(filters);
    const header = "id,userId,action,entityType,entityId,createdAt,ipAddress,metadata";
    const csvRows = rows.map((r) =>
      [
        r.id,
        r.userId ?? "",
        r.action,
        r.entityType ?? "",
        r.entityId ?? "",
        r.createdAt.toISOString(),
        r.ipAddress ?? "",
        JSON.stringify(r.metadata ?? {}),
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(","),
    );
    return [header, ...csvRows].join("\n");
  }

  /**
   * Timeline View — the same search, but intended for entity-scoped,
   * chronological display (e.g. one user's or one organization's full
   * activity feed) rather than a flat admin-wide table. Reuses
   * `search()`'s filters/paging rather than a separate query path.
   */
  timeline(filters: AuditSearchFilters, query: OffsetPaginationQuery): Promise<PaginatedResult<AuditLog>> {
    return this.search(filters, query);
  }
}
