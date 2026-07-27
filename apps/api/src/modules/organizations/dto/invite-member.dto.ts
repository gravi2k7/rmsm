import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const ORGANIZATION_ROLE_VALUES = [
  "ADMINISTRATOR",
  "MANAGER",
  "ANALYST",
  "TRADER",
  "VIEWER",
] as const;

/**
 * OWNER is deliberately excluded from the allowed values — you cannot
 * invite someone directly into ownership; ownership only moves via the
 * dedicated transfer-ownership workflow (Decision 1), which requires the
 * target to already be an active member.
 */
export class InviteMemberDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ORGANIZATION_ROLE_VALUES })
  @IsEnum(ORGANIZATION_ROLE_VALUES)
  role!: (typeof ORGANIZATION_ROLE_VALUES)[number];

  /**
   * WM-020E — optional personal note from the inviter, included verbatim
   * in the invitation email. Not persisted (OrganizationInvitation has no
   * message column, and this is a one-time, fire-and-forget email body —
   * adding a schema column for it isn't warranted, matching "reuse
   * existing services/repositories, don't add new persistence surface
   * unless required").
   */
  @ApiPropertyOptional({ example: "Excited to have you on the desk!" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  /**
   * WM-020E — "Configurable expiration." Existing behavior (a fixed
   * 7-day TTL) remains the default when omitted; this only lets an
   * inviter shorten or extend that window per-invitation, reusing the
   * same `expiresAt` column `createInvitation()` already writes.
   */
  @ApiPropertyOptional({ example: 7, minimum: 1, maximum: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
