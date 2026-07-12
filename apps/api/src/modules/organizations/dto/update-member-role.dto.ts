import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";

/** Same OWNER exclusion as InviteMemberDto, for the same reason — see that file's comment. */
const ORGANIZATION_ROLE_VALUES = [
  "ADMINISTRATOR",
  "MANAGER",
  "ANALYST",
  "TRADER",
  "VIEWER",
] as const;

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ORGANIZATION_ROLE_VALUES })
  @IsEnum(ORGANIZATION_ROLE_VALUES)
  role!: (typeof ORGANIZATION_ROLE_VALUES)[number];
}
