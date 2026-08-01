import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";
import { Type } from "class-transformer";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "@rmsm/database";

/**
 * Module 004 Domain 3 — query DTO for the admin session listing
 * (`GET /sessions/admin`). Mirrors `UserDirectoryQueryDto`'s conventions.
 */
export class SessionAdminQueryDto {
  @ApiPropertyOptional({ description: "Filter to one user's sessions." })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: ["active", "revoked", "expired"] })
  @IsOptional()
  @IsIn(["active", "revoked", "expired"])
  status?: "active" | "revoked" | "expired";

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
