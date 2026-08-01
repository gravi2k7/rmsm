import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsObject, IsOptional, IsString, IsUrl, MaxLength, MinLength } from "class-validator";

/**
 * Deliberately has no `slug` field — slug changes are permanent-identifier
 * territory (ADR-003) and go through a dedicated rename endpoint/service
 * method, never through a generic update. Mirrors
 * OrganizationRepository.UpdateOrganizationDetailsInput's exclusion at the
 * DTO layer, so the same rule is enforced at both the API boundary and the
 * repository boundary.
 *
 * Module 003: also used as the "Update Organization Profile" DTO
 * (`PATCH /organizations/current/profile`) — the profile fields below are
 * a superset of what "Update Organization" already covered, so a
 * dedicated `UpdateOrganizationProfileDto` would have been a near-exact
 * duplicate of this class. Reused instead.
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

  // ── Module 003 additions (additive, all optional) ──────────────────
  @ApiPropertyOptional({ description: "Cosmetic display name shown in the UI; falls back to `name` when omitted." })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ example: "en-US" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  locale?: string;
}
