import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Matches } from "class-validator";

const FEATURE_TYPE_VALUES = ["BOOLEAN", "LIMIT"] as const;

export class CreateFeatureFlagDto {
  @ApiProperty({ example: "ai_requests" })
  @IsString()
  @Matches(/^[a-z0-9_]+$/, { message: "key must be lowercase letters, numbers, and underscores only" })
  key!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: FEATURE_TYPE_VALUES })
  @IsEnum(FEATURE_TYPE_VALUES)
  type!: (typeof FEATURE_TYPE_VALUES)[number];
}
