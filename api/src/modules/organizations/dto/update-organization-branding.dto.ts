import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUrl } from "class-validator";
import { BrandingSettingsDto } from "./organization-settings-v2.dto";

/**
 * `PATCH /organizations/current/branding` convenience DTO. Extends
 * `BrandingSettingsDto` (from organization-settings-v2.dto.ts) rather than
 * re-declaring the same 5 fields — the only addition is `logoUrl`, which
 * lives on the top-level `Organization.logoUrl` column (already used by
 * the general Update Organization endpoint), not inside the `settings`
 * JSON, so it isn't part of `BrandingSettingsDto` itself.
 */
export class UpdateOrganizationBrandingDto extends BrandingSettingsDto {
  @ApiPropertyOptional({ description: "Mirrors the top-level Organization.logoUrl column." })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
