import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

const CHANNEL_VALUES = ["EMAIL", "SMS", "PUSH", "IN_APP", "WEBHOOK"] as const;

export class UpdateCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CHANNEL_VALUES })
  @IsOptional()
  @IsEnum(CHANNEL_VALUES)
  defaultChannel?: (typeof CHANNEL_VALUES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
