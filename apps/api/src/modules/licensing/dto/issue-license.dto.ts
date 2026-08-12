import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from "class-validator";
import { LicenseType } from "@rmsm/database";

export class IssueLicenseDto {
  @ApiProperty({ enum: ["PLATFORM", "ENTERPRISE", "TRIAL"] })
  @IsEnum(["PLATFORM", "ENTERPRISE", "TRIAL"] as const)
  type!: LicenseType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
