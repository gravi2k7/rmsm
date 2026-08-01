import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreatePermissionDto {
  @ApiProperty({ example: "reports.export", description: "Dotted key. Application code references permissions by key, never by id." })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*)+$/, { message: "key must be dotted.lowercase.segments, e.g. \"reports.export\"." })
  key!: string;

  @ApiProperty({ example: "reports", description: "Groups permissions for admin UI display — also the \"category\" in Permission Categories." })
  @IsString()
  @MaxLength(50)
  group!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
