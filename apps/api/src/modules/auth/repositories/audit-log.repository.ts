import { Injectable } from "@nestjs/common";
import { prisma, Prisma, AuditLog } from "@rmsm/database";
import { paginate, type PaginatedResult, type OffsetPaginationQuery } from "@rmsm/database";

@Injectable()
export class AuditLogRepository {
  create(data: {
    userId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuditLog> {
    return prisma.auditLog.create({ data });
  }

  findByUser(userId: string, take = 50): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  /**
   * Module 003 addition (additive). Used by OrganizationDashboardService's
   * "Recent Activity" dashboard section — every organization-scoped audit
   * entry already logs entityType: "Organization", entityId: organizationId
   * (see OrganizationService/OrganizationMembershipService's
   * auditService.log() calls), so this is a direct, reusable read over
   * data that already exists rather than a new logging path.
   */
  findByEntity(entityType: string, entityId: string, take = 20): Promise<AuditLog[]> {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  /**
   * Module 004 Domain 4 addition — the general-purpose admin audit search
   * (`GET /audit/search`), filterable by any combination of user, action
   * (exact or prefix, e.g. "role." to catch role.created/role.updated/
   * role.assigned in one query), entity, and a createdAt date range. Uses
   * the canonical `paginate()` helper, same as `LoginHistoryRepository`/
   * `SessionRepository`'s Module 004 additions.
   */
  search(
    filters: {
      userId?: string;
      action?: string;
      actionPrefix?: string;
      entityType?: string;
      entityId?: string;
      from?: Date;
      to?: Date;
    },
    query: OffsetPaginationQuery,
  ): Promise<PaginatedResult<AuditLog>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.actionPrefix ? { action: { startsWith: filters.actionPrefix } } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.from || filters.to
        ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    };
    return paginate(
      {
        findMany: (args) => prisma.auditLog.findMany({ ...args, orderBy: { createdAt: "desc" } }),
        count: (args) => prisma.auditLog.count(args),
      },
      where,
      query,
    );
  }

  /**
   * Module 004 Domain 4 addition — unpaginated export for `GET
   * /audit/export` (CSV, mirrors `UserManagementService`'s existing
   * `bulk-export`). Capped at 5000 rows so a broad/unfiltered export
   * request can't attempt to load an unbounded result set into memory —
   * a real, named limit, not a silent truncation (the controller
   * surfaces this cap in its `@ApiOperation` summary).
   */
  exportRows(filters: {
    userId?: string;
    action?: string;
    actionPrefix?: string;
    entityType?: string;
    entityId?: string;
    from?: Date;
    to?: Date;
  }): Promise<AuditLog[]> {
    const where: Prisma.AuditLogWhereInput = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.actionPrefix ? { action: { startsWith: filters.actionPrefix } } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.entityId ? { entityId: filters.entityId } : {}),
      ...(filters.from || filters.to
        ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
        : {}),
    };
    return prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: 5000 });
  }
}
