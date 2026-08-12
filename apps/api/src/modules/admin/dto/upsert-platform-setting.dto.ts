import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmptyObject, IsOptional, IsString } from "class-validator";

export class UpsertPlatformSettingDto {
  @ApiProperty({ example: "app.support_email" })
  @IsString()
  key!: string;

  @ApiProperty({ description: "Any JSON-serializable value." })
  value!: unknown;

  @ApiProperty({ example: "general" })
  @IsString()
  category!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
