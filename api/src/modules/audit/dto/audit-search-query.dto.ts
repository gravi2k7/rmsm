import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@rmsm/database";

/**
 * Module 004 Domain 4 — query DTO for `GET /audit/search` and (minus
 * paging) `GET /audit/export`. `actionPrefix` supports the Timeline
 * View's "show me all role.* events" style grouping without requiring
 * an exact action-name match.
 */
export class AuditSearchQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: "Exact action match, e.g. 'user.login'." })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: "Action-prefix match, e.g. 'role.' for every role.* event." })
  @IsOptional()
  @IsString()
  actionPrefix?: string;

  @ApiPropertyOptional({ description: "e.g. 'User', 'Organization', 'Session', 'Role'." })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: "ISO 8601 — createdAt lower bound." })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "ISO 8601 — createdAt upper bound." })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_PAGE_SIZE, default: DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
