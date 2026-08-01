import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsUUID, Min } from "class-validator";
import { Type } from "class-transformer";
import { LicenseStatus, LicenseType } from "@rmsm/database";

export class LicenseQueryDto {
  @ApiPropertyOptional({ enum: ["UNASSIGNED", "ACTIVE", "EXPIRED", "REVOKED"] })
  @IsOptional()
  @IsEnum(["UNASSIGNED", "ACTIVE", "EXPIRED", "REVOKED"] as const)
  status?: LicenseStatus;

  @ApiPropertyOptional({ enum: ["PLATFORM", "ENTERPRISE", "TRIAL"] })
  @IsOptional()
  @IsEnum(["PLATFORM", "ENTERPRISE", "TRIAL"] as const)
  type?: LicenseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}
