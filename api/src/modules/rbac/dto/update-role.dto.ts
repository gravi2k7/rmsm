import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

/** No `name` field — role names follow the same SCREAMING_SNAKE_CASE identifier convention CreateRoleDto enforces at creation; renaming is out of scope here (mirrors UpdatePermissionDto's `key` exclusion). */
export class UpdateRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
