import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

/**
 * Dedicated endpoint/DTO for the `settings` JSON blob specifically —
 * distinct from UpdateOrganizationDto's optional `settings` field, which
 * merges into a broader details update. This one replaces `settings`
 * wholesale, matching the "Update Organization Settings" capability listed
 * separately from "Update Organization" in the functional spec.
 */
export class OrganizationSettingsDto {
  @ApiProperty({ type: "object", example: { branding: { primaryColor: "#0F172A" } } })
  @IsObject()
  settings!: Record<string, unknown>;
}
