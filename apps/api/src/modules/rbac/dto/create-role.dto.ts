import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, Matches } from "class-validator";

export class CreateRoleDto {
  @ApiProperty({ example: "REGIONAL_MANAGER" })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: "Role name must be SCREAMING_SNAKE_CASE." })
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
