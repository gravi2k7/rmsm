import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsObject, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

/**
 * Deliberately has no `slug` field — slug changes are permanent-identifier
 * territory (ADR-003) and go through a dedicated rename endpoint/service
 * method, never through a generic update. Mirrors
 * OrganizationRepository.UpdateOrganizationDetailsInput's exclusion at the
 * DTO layer, so the same rule is enforced at both the API boundary and the
 * repository boundary.
 */
export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ type: "object" })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
