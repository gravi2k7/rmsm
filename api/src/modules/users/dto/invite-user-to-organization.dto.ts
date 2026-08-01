import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";
import { IsIn } from "class-validator";

const ORG_ROLE_VALUES = ["OWNER", "ADMINISTRATOR", "MANAGER", "ANALYST", "TRADER", "VIEWER"] as const;

/**
 * Thin admin-surface wrapper DTO for `OrganizationInvitationService.
 * createInvitation()` (Module 003, unmodified) — "Invite Users" in this
 * platform's data model IS an organization invitation; there is no
 * separate, org-independent invitation mechanism to build a parallel DTO
 * for.
 */
export class InviteUserToOrganizationDto {
  @ApiProperty()
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ORG_ROLE_VALUES })
  @IsIn(ORG_ROLE_VALUES)
  role!: (typeof ORG_ROLE_VALUES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
