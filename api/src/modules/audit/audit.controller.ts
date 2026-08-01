import { Controller, Get, Header, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AuditLog } from "@rmsm/database";
import type { PaginatedResult } from "@rmsm/database";
import { AuditQueryService } from "./services/audit-query.service";
import { AuditSearchQueryDto } from "./dto/audit-search-query.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";

/**
 * Module 004 Domain 4 — Audit Logs & Activity Monitoring. Purely a read
 * surface: every write still goes through the pre-existing
 * `AuditService.log()` (see its own doc comment — "the single write path
 * for AuditLog"), used unmodified by every other module. `audit.read` is
 * a pre-existing permission key (already present in `seed.ts` and already
 * granted to SUPPORT/ANALYST-equivalent roles) — no new permission grants
 * are required for this domain.
 */
@ApiTags("Audit")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditQueryService: AuditQueryService) {}

  @Get()
  @RequirePermissions("audit.read")
  @ApiOperation({ summary: "List recent audit log entries (paginated, unfiltered)." })
  list(@Query() query: AuditSearchQueryDto): Promise<PaginatedResult<AuditLog>> {
    return this.auditQueryService.search(toFilters(query), { page: query.page, pageSize: query.pageSize });
  }

  @Get("search")
  @RequirePermissions("audit.read")
  @ApiOperation({ summary: "Search audit log entries by user, action (exact or prefix), entity, and date range." })
  search(@Query() query: AuditSearchQueryDto): Promise<PaginatedResult<AuditLog>> {
    return this.auditQueryService.search(toFilters(query), { page: query.page, pageSize: query.pageSize });
  }

  @Get("export")
  @RequirePermissions("audit.read")
  @Header("Content-Type", "text/csv")
  @Header("Content-Disposition", 'attachment; filename="audit-log-export.csv"')
  @ApiOperation({ summary: "Export matching audit log entries as CSV (capped at 5000 rows)." })
  export(@Query() query: AuditSearchQueryDto): Promise<string> {
    return this.auditQueryService.export(toFilters(query));
  }

  @Get("entity/:entityType/:entityId/timeline")
  @RequirePermissions("audit.read")
  @ApiOperation({ summary: "Chronological activity timeline for one entity (e.g. one User or Organization)." })
  timeline(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Query() query: AuditSearchQueryDto,
  ): Promise<PaginatedResult<AuditLog>> {
    return this.auditQueryService.timeline(
      { ...toFilters(query), entityType, entityId },
      { page: query.page, pageSize: query.pageSize },
    );
  }
}

function toFilters(query: AuditSearchQueryDto) {
  return {
    userId: query.userId,
    action: query.action,
    actionPrefix: query.actionPrefix,
    entityType: query.entityType,
    entityId: query.entityId,
    from: query.from ? new Date(query.from) : undefined,
    to: query.to ? new Date(query.to) : undefined,
  };
}
