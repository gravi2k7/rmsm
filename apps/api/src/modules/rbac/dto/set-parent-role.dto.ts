import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsUUID } from "class-validator";

export class SetParentRoleDto {
  /** Omit or send `null` to clear the parent (no inheritance). */
  @ApiPropertyOptional({ nullable: true, description: "The new parent role's id, or null to clear inheritance." })
  @IsOptional()
  @IsUUID()
  parentRoleId?: string | null;
}
