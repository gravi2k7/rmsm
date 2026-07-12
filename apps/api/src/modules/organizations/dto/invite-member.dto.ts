import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum } from "class-validator";

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
}
